import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireProjectCtx, guardStepOrder } from '$lib/server/submit-guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	guardStepOrder(await parent(), 'checklist');
};

export const actions: Actions = {
	default: async ({ locals }) => {
		const ctx = await requireProjectCtx(locals);
		await prisma.project.update({
			where: { id: ctx.project.id },
			data: {
				checklistCompletedAt: ctx.project.checklistCompletedAt ?? new Date(),
				currentStep: Math.max(ctx.project.currentStep, 2)
			}
		});
		redirect(302, '/submit/details');
	}
};
