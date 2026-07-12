import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getDisplayNames } from '$lib/server/cachet';
import type { PageServerLoad } from './$types';

// Public read-only gallery — no auth. Never expose participant emails here;
// makers show their Slack display name (via cachet), falling back to real name.
export const load: PageServerLoad = async ({ params }) => {
	const event = await prisma.event.findUnique({ where: { slug: params.slug } });
	if (!event) error(404, 'Event not found');

	const projects = await prisma.project.findMany({
		where: { eventId: event.id, submittedAt: { not: null } },
		include: { team: { include: { members: { include: { participant: true } } } } },
		orderBy: { submittedAt: 'asc' }
	});

	const displayNames = await getDisplayNames(
		projects.flatMap((p) => p.team.members.map((m) => m.participant.slackId)).filter((id) => id !== null)
	);

	return {
		eventName: event.name,
		slug: event.slug,
		projects: projects.map((p) => {
			const makers = p.team.members
				.map(
					(m) =>
						(m.participant.slackId && displayNames.get(m.participant.slackId)) ||
						`${m.participant.firstName ?? ''} ${m.participant.lastName ?? ''}`.trim()
				)
				.filter(Boolean);
			return {
				id: p.id,
				name: p.name,
				description: p.description,
				screenshotUrl: p.screenshotUrl,
				makers: makers.length ? makers : ['Anonymous']
			};
		})
	};
};
