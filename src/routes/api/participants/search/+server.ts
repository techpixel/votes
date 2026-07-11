import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext } from '$lib/server/flow';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not signed in');
	const ctx = await getParticipantContext(locals.user);
	if (!ctx) error(403, 'Not a participant');

	const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	if (q.length < 2) return json({ results: [] });

	const results = await prisma.participant.findMany({
		where: {
			eventId: ctx.event.id,
			id: { not: ctx.participant.id },
			teamMember: null, // not already on a team
			OR: [
				{ email: { contains: q, mode: 'insensitive' } },
				{ firstName: { contains: q, mode: 'insensitive' } },
				{ lastName: { contains: q, mode: 'insensitive' } }
			]
		},
		take: 8
	});

	return json({
		results: results.map((p) => ({
			id: p.id,
			name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email,
			email: p.email
		}))
	});
};
