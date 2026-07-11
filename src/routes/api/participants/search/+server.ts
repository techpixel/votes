import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext } from '$lib/server/flow';
import { getDisplayNames } from '$lib/server/cachet';
import { shortName } from '$lib/names';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not signed in');
	const ctx = await getParticipantContext(locals.user);
	if (!ctx) error(403, 'Not a participant');

	const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	if (q.length < 2) return json({ results: [] });

	// Match by Slack display name, which requires resolving names for the whole
	// candidate pool first (cachet memoizes, so this is cheap after the first
	// search). First name remains matchable; emails are neither matched nor returned.
	const candidates = await prisma.participant.findMany({
		where: {
			eventId: ctx.event.id,
			id: { not: ctx.participant.id },
			teamMember: null // not already on a team
		},
		select: { id: true, firstName: true, lastName: true, slackId: true }
	});

	const displayNames = await getDisplayNames(
		candidates.map((p) => p.slackId).filter((id): id is string => !!id)
	);

	const results = candidates
		.map((p) => ({
			id: p.id,
			name: shortName(p.firstName, p.lastName),
			displayName: p.slackId ? (displayNames.get(p.slackId) ?? null) : null
		}))
		.filter(
			(p) =>
				p.displayName?.toLowerCase().includes(q) || p.name.toLowerCase().split(' ')[0].includes(q)
		)
		.slice(0, 8);

	return json({ results });
};
