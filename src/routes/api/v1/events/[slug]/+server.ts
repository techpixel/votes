import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireApiKey } from '$lib/server/api-auth';
import { slugify } from '$lib/server/slug';
import { resolveOrigin, serializeEvent } from '$lib/server/event-response';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params, url }) => {
	requireApiKey(request);

	const slug = slugify(params.slug);
	const event = slug ? await prisma.event.findUnique({ where: { slug } }) : null;
	if (!event) error(404, `No event with slug "${params.slug}"`);

	return json(serializeEvent(event, resolveOrigin(url)));
};
