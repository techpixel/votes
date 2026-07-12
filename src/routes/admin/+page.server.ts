import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getAdminScope } from '$lib/server/admin';
import { slugify } from '$lib/server/slug';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const scope = await getAdminScope(locals.user);
	if (!scope) error(404, 'Not found');

	const events = await prisma.event.findMany({
		where: scope.superadmin ? {} : { id: { in: scope.events.map((e) => e.id) } },
		orderBy: { createdAt: 'desc' },
		include: { _count: { select: { participants: true, projects: true, votes: true } } }
	});

	return {
		superadmin: scope.superadmin,
		events: events.map((e) => ({
			id: e.id,
			name: e.name,
			slug: e.slug,
			stage: e.stage,
			participants: e._count.participants,
			projects: e._count.projects,
			votes: e._count.votes
		}))
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const scope = await getAdminScope(locals.user);
		// Only superadmins can create events.
		if (!scope?.superadmin) error(403, 'Only superadmins can create events');

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { message: 'Event name is required' });

		const slug = slugify(String(form.get('slug') ?? '').trim()) || slugify(name);

		const existing = await prisma.event.findUnique({ where: { slug } });
		if (existing) return fail(400, { message: `An event with slug "${slug}" already exists` });

		const event = await prisma.event.create({
			data: {
				name,
				slug,
				voteLimit: Number(form.get('voteLimit')) || 3,
				maxTeamSize: Number(form.get('maxTeamSize')) || 3,
				checklistItems: []
			}
		});
		redirect(302, `/admin/events/${event.id}`);
	}
};
