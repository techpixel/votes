import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext } from '$lib/server/flow';
import { getDisplayNames } from '$lib/server/slack';
import { shortName } from '$lib/names';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not signed in');
	const slug = url.searchParams.get('event') ?? undefined;
	const ctx = await getParticipantContext(locals.user, slug);
	if (!ctx) error(403, 'Not a participant');

	const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	if (q.length < 2) return json({ results: [] });

	// Match by Slack display name, which requires resolving names for the whole
	// candidate pool first (lookups are memoized, so this is cheap after the first
	// search). First name remains matchable; emails are neither matched nor returned.
	const pool = await prisma.participant.findMany({
		where: {
			eventId: ctx.event.id,
			id: { not: ctx.participant.id }
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			slackId: true,
			teamMember: {
				select: {
					teamId: true,
					team: {
						select: {
							project: { select: { submittedAt: true } },
							_count: { select: { members: true } }
						}
					}
				}
			}
		}
	});

	// Addable: teamless, or alone on an unsubmitted draft team — the team
	// action dissolves that solo draft when they're added here.
	const candidates = pool.filter(
		(p) =>
			!p.teamMember ||
			(p.teamMember.teamId !== ctx.team?.id &&
				p.teamMember.team._count.members === 1 &&
				!p.teamMember.team.project?.submittedAt)
	);

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
