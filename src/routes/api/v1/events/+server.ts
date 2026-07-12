import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { requireApiKey } from '$lib/server/api-auth';
import { slugify } from '$lib/server/slug';
import { Prisma } from '../../../../generated/prisma/client';
import type { RequestHandler } from './$types';

const schema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'name is required')
		.max(100, 'name must be at most 100 characters'),
	logoUrl: z.url({ protocol: /^https?$/, error: 'logoUrl must be a valid http(s) URL' }),
	backgroundUrl: z.url({
		protocol: /^https?$/,
		error: 'backgroundUrl must be a valid http(s) URL'
	}),
	slug: z.string().trim().max(64, 'slug must be at most 64 characters').optional(),
	voteLimit: z.number().int().min(1).max(50).optional(),
	maxTeamSize: z.number().int().min(1).max(20).optional(),
	checklist: z.string().optional()
});

/** Parses the `checklist` field — a YAML list of strings — into checklistItems. */
function parseChecklist(checklist: string | undefined): string[] {
	if (checklist === undefined || checklist.trim() === '') return [];

	let parsed: unknown;
	try {
		parsed = parseYaml(checklist);
	} catch {
		error(400, 'checklist must be valid YAML');
	}

	if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
		error(400, 'checklist must be a YAML list of strings (e.g. "- Add a demo link")');
	}
	const items = parsed.map((item) => item.trim()).filter(Boolean);
	if (items.length === 0) error(400, 'checklist must contain at least one item');
	return items;
}

export const POST: RequestHandler = async ({ request, url }) => {
	requireApiKey(request);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON');
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) error(400, parsed.error.issues[0].message);

	const checklistItems = parseChecklist(parsed.data.checklist);

	const slug = slugify(parsed.data.slug ?? parsed.data.name);
	if (!slug) error(400, 'slug must contain at least one alphanumeric character');

	if (await prisma.event.findUnique({ where: { slug } })) {
		error(409, `An event with slug "${slug}" already exists`);
	}

	let event;
	try {
		event = await prisma.event.create({
			data: {
				name: parsed.data.name,
				slug,
				logoUrl: parsed.data.logoUrl,
				backgroundUrl: parsed.data.backgroundUrl,
				voteLimit: parsed.data.voteLimit ?? 3,
				maxTeamSize: parsed.data.maxTeamSize ?? 3,
				checklistItems
			}
		});
	} catch (e) {
		// Race between the uniqueness pre-check and the insert.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			error(409, `An event with slug "${slug}" already exists`);
		}
		throw e;
	}

	const origin = (env.APP_ORIGIN || url.origin).replace(/\/+$/, '');
	return json(
		{
			id: event.id,
			name: event.name,
			slug: event.slug,
			stage: event.stage,
			voteLimit: event.voteLimit,
			maxTeamSize: event.maxTeamSize,
			logoUrl: event.logoUrl,
			backgroundUrl: event.backgroundUrl,
			checklistItems: event.checklistItems,
			createdAt: event.createdAt.toISOString(),
			adminUrl: `${origin}/admin/events/${event.id}`,
			galleryUrl: `${origin}/gallery/${event.slug}`
		},
		{ status: 201 }
	);
};
