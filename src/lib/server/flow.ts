import { prisma } from './db';
import type { User } from '../../generated/prisma/client';

export const SUBMIT_STEPS = ['team', 'checklist', 'details', 'links', 'hours'] as const;
export type SubmitStep = (typeof SUBMIT_STEPS)[number];

/** Stage priority when a user belongs to several events. */
const STAGE_PRIORITY = { VOTING: 0, SUBMISSION: 1, CLOSED: 2, DRAFT: 3 } as const;

/** All participant rows for this user (matched by linked account or email). */
async function findParticipations(user: User) {
	return prisma.participant.findMany({
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
}

type Participation = Awaited<ReturnType<typeof findParticipations>>[number];

function toContext(participant: Participation) {
	return {
		participant,
		event: participant.event,
		team: participant.teamMember?.team ?? null,
		project: participant.teamMember?.team.project ?? null
	};
}

/**
 * Resolve the participant context for a user.
 *
 * With a `slug`, scopes to that specific event (returns null if the user isn't
 * a participant of it). Without one, auto-selects the most relevant event by
 * stage priority — used by the root redirect and the single-event fast path.
 */
export async function getParticipantContext(user: User, slug?: string) {
	const participants = await findParticipations(user);
	if (participants.length === 0) return null;

	if (slug) {
		const match = participants.find((p) => p.event.slug === slug);
		return match ? toContext(match) : null;
	}

	participants.sort((a, b) => STAGE_PRIORITY[a.event.stage] - STAGE_PRIORITY[b.event.stage]);
	return toContext(participants[0]);
}

/** Events this user can act in, ordered by stage priority — powers the picker. */
export async function getEligibleEvents(user: User) {
	const participants = await findParticipations(user);
	participants.sort((a, b) => STAGE_PRIORITY[a.event.stage] - STAGE_PRIORITY[b.event.stage]);
	return participants.map((p) => ({
		slug: p.event.slug,
		name: p.event.name,
		stage: p.event.stage,
		logoUrl: p.event.logoUrl,
		backgroundUrl: p.event.backgroundUrl,
		tagline: p.event.tagline
	}));
}

export type ParticipantContext = NonNullable<Awaited<ReturnType<typeof getParticipantContext>>>;

/**
 * Where the participant should be right now, scoped to their event. Root `/`
 * and `/e/[slug]` redirect here, and each page validates it's the current
 * destination.
 */
export function flowDestination(ctx: ParticipantContext): string {
	const { event, team, project } = ctx;
	const base = `/e/${event.slug}`;

	if (event.stage === 'DRAFT') return `${base}/waiting`;
	if (event.stage === 'CLOSED') return `${base}/closed`;

	// Submissions lock when voting starts; teams that never submitted sit voting out.
	if (event.stage === 'VOTING') return project?.submittedAt ? `${base}/project` : `${base}/locked`;

	if (!team) return `${base}/submit/team`;
	if (!project || !project.submittedAt) {
		const step = SUBMIT_STEPS[Math.min(project?.currentStep ?? 1, SUBMIT_STEPS.length - 1)];
		return `${base}/submit/${step}`;
	}

	return `${base}/project`;
}
