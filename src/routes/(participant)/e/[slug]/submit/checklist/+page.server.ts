import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireProjectCtx, guardStepOrder } from '$lib/server/submit-guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	guardStepOrder(await parent(), 'checklist', params.slug);
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const ctx = await requireProjectCtx(locals, params.slug);
		await prisma.project.update({
			where: { id: ctx.project.id },
			data: {
				checklistCompletedAt: ctx.project.checklistCompletedAt ?? new Date(),
				currentStep: Math.max(ctx.project.currentStep, 2)
			}
		});
		redirect(302, `/e/${params.slug}/submit/details`);
	}
};
