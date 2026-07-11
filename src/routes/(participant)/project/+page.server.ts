import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user);
	if (!ctx) redirect(302, '/');
	if (ctx.event.stage === 'DRAFT') redirect(302, '/waiting');
	if (ctx.event.stage === 'CLOSED') redirect(302, '/closed');
	if (!ctx.project?.submittedAt) redirect(302, flowDestination(ctx));

	return {
		stage: ctx.event.stage,
		project: {
			name: ctx.project.name,
			description: ctx.project.description,
			screenshotUrl: ctx.project.screenshotUrl,
			demoUrl: ctx.project.demoUrl,
			repoUrl: ctx.project.repoUrl
		},
		makers: ctx.team!.members.map(
			(m) =>
				`${m.participant.firstName ?? ''} ${m.participant.lastName ?? ''}`.trim() ||
				m.participant.email
		)
	};
};
