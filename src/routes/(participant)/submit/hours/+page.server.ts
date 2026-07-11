import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireProjectCtx, guardStepOrder } from '$lib/server/submit-guard';
import { syncProjectToAirtable } from '$lib/server/airtable';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	guardStepOrder(await parent(), 'hours');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const ctx = await requireProjectCtx(locals);
		const form = await request.formData();

		const updates: { memberId: string; hours: number; hackatimeProjects: string[] }[] = [];
		for (const member of ctx.team.members) {
			const hoursRaw = String(form.get(`hours:${member.id}`) ?? '').trim();
			const hours = Number(hoursRaw);
			if (!hoursRaw || !Number.isFinite(hours) || hours < 0 || hours > 1000) {
				const name = member.participant.firstName ?? member.participant.email;
				return fail(400, { message: `Enter a valid hour estimate for ${name}.` });
			}
			const hackatimeProjects = String(form.get(`hackatime:${member.id}`) ?? '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			updates.push({ memberId: member.id, hours, hackatimeProjects });
		}

		await prisma.$transaction(async (tx) => {
			for (const u of updates) {
				await tx.teamMember.update({
					where: { id: u.memberId },
					data: { hoursEstimate: u.hours, hackatimeProjects: u.hackatimeProjects }
				});
			}
			await tx.project.update({
				where: { id: ctx.project.id },
				data: {
					currentStep: 5,
					submittedAt: ctx.project.submittedAt ?? new Date()
				}
			});
		});

		// Mirror into Airtable in the background; failures are stored per record.
		void syncProjectToAirtable(ctx.project.id).catch((e) =>
			console.error('[airtable] sync failed:', e)
		);

		redirect(302, '/project');
	}
};
