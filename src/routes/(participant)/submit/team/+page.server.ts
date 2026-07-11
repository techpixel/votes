import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getParticipantContext } from '$lib/server/flow';
import { deleteAirtableRecords, syncProjectToAirtable } from '$lib/server/airtable';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Gating handled by ../+layout.server.ts; the team step is always reachable.
	return {};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) redirect(302, '/login');
		const ctx = await getParticipantContext(locals.user);
		if (!ctx) redirect(302, '/');
		if (ctx.event.stage !== 'SUBMISSION') redirect(302, '/');

		const form = await request.formData();
		let ids: string[];
		try {
			ids = JSON.parse(String(form.get('memberIds') ?? '[]'));
		} catch {
			return fail(400, { message: 'Invalid team selection.' });
		}

		// Self is always on the team.
		const memberIds = [...new Set([ctx.participant.id, ...ids])];
		if (memberIds.length > ctx.event.maxTeamSize) {
			return fail(400, { message: `Teams can have at most ${ctx.event.maxTeamSize} members.` });
		}

		const participants = await prisma.participant.findMany({
			where: { id: { in: memberIds }, eventId: ctx.event.id },
			include: { teamMember: true }
		});
		if (participants.length !== memberIds.length) {
			return fail(400, { message: 'Someone you selected is not registered for this event.' });
		}
		const taken = participants.find(
			(p) => p.teamMember && p.teamMember.teamId !== ctx.team?.id
		);
		if (taken) {
			return fail(400, {
				message: `${taken.firstName ?? 'A person you selected'} is already on another team.`
			});
		}

		// Airtable records of members about to be removed (cascade wipes the tracking rows).
		const removedRecords = ctx.team
			? await prisma.airtableRecord.findMany({
					where: {
						teamMember: { teamId: ctx.team.id, participantId: { notIn: memberIds } },
						airtableRecordId: { not: null }
					}
				})
			: [];

		await prisma.$transaction(async (tx) => {
			let teamId = ctx.team?.id;
			if (!teamId) {
				const team = await tx.team.create({
					data: {
						eventId: ctx.event.id,
						createdByParticipantId: ctx.participant.id,
						project: { create: { eventId: ctx.event.id, currentStep: 1 } }
					}
				});
				teamId = team.id;
			}
			// Sync membership: remove people no longer selected, add new ones.
			await tx.teamMember.deleteMany({
				where: { teamId, participantId: { notIn: memberIds } }
			});
			for (const pid of memberIds) {
				await tx.teamMember.upsert({
					where: { participantId: pid },
					update: {},
					create: { teamId, participantId: pid }
				});
			}
		});

		// Keep Airtable in step when editing an already-submitted project.
		if (removedRecords.length > 0) {
			void deleteAirtableRecords(
				ctx.event.airtableBaseId,
				ctx.event.airtableTableId,
				removedRecords.map((r) => r.airtableRecordId!)
			);
		}
		if (ctx.project?.submittedAt) {
			void syncProjectToAirtable(ctx.project.id).catch((e) =>
				console.error('[airtable] resync after team change failed:', e)
			);
		}

		redirect(302, '/submit/checklist');
	}
};
