import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const ctx = await getParticipantContext(locals.user);
	if (!ctx) redirect(302, '/');
	// Submit pages only exist during SUBMISSION — editing locks once voting starts.
	if (ctx.event.stage !== 'SUBMISSION') redirect(302, flowDestination(ctx));

	return {
		event: {
			id: ctx.event.id,
			name: ctx.event.name,
			stage: ctx.event.stage,
			maxTeamSize: ctx.event.maxTeamSize,
			checklistItems: ctx.event.checklistItems
		},
		participant: {
			id: ctx.participant.id,
			email: ctx.participant.email,
			firstName: ctx.participant.firstName,
			lastName: ctx.participant.lastName
		},
		members: ctx.team
			? ctx.team.members.map((m) => ({
					id: m.id,
					participantId: m.participantId,
					name:
						`${m.participant.firstName ?? ''} ${m.participant.lastName ?? ''}`.trim() ||
						m.participant.email,
					email: m.participant.email,
					hoursEstimate: m.hoursEstimate,
					hackatimeProjects: m.hackatimeProjects
				}))
			: null,
		project: ctx.project
			? {
					id: ctx.project.id,
					name: ctx.project.name,
					description: ctx.project.description,
					screenshotUrl: ctx.project.screenshotUrl,
					demoUrl: ctx.project.demoUrl,
					repoUrl: ctx.project.repoUrl,
					currentStep: ctx.project.currentStep,
					checklistCompletedAt: ctx.project.checklistCompletedAt,
					submittedAt: ctx.project.submittedAt
				}
			: null
	};
};
