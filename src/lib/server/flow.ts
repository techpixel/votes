import { prisma } from './db';
import type { User } from '../../generated/prisma/client';

export const SUBMIT_STEPS = ['team', 'checklist', 'details', 'links', 'hours'] as const;
export type SubmitStep = (typeof SUBMIT_STEPS)[number];

/** Stage priority when a user belongs to several events. */
const STAGE_PRIORITY = { VOTING: 0, SUBMISSION: 1, CLOSED: 2, DRAFT: 3 } as const;

export async function getParticipantContext(user: User) {
	const participants = await prisma.participant.findMany({
		where: { OR: [{ userId: user.id }, { email: user.email }] },
		include: {
			event: true,
			teamMember: {
				include: {
					team: {
						include: {
							members: { include: { participant: true } },
							project: true
						}
					}
				}
			}
		}
	});
	if (participants.length === 0) return null;

	participants.sort((a, b) => STAGE_PRIORITY[a.event.stage] - STAGE_PRIORITY[b.event.stage]);
	const participant = participants[0];

	return {
		participant,
		event: participant.event,
		team: participant.teamMember?.team ?? null,
		project: participant.teamMember?.team.project ?? null
	};
}

export type ParticipantContext = NonNullable<Awaited<ReturnType<typeof getParticipantContext>>>;

/**
 * Where the participant should be right now. Root `/` always redirects here,
 * and each page validates it's the current destination.
 */
export function flowDestination(ctx: ParticipantContext): string {
	const { event, team, project } = ctx;

	if (event.stage === 'DRAFT') return '/waiting';
	if (event.stage === 'CLOSED') return '/closed';

	// Submissions lock when voting starts; teams that never submitted sit voting out.
	if (event.stage === 'VOTING') return project?.submittedAt ? '/project' : '/locked';

	if (!team) return '/submit/team';
	if (!project || !project.submittedAt) {
		const step = SUBMIT_STEPS[Math.min(project?.currentStep ?? 1, SUBMIT_STEPS.length - 1)];
		return `/submit/${step}`;
	}

	return '/project';
}
