import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { requireProjectCtx, guardStepOrder } from '$lib/server/submit-guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params }) => {
	guardStepOrder(await parent(), 'links', params.slug);
};

const urlField = (message: string) =>
	z
		.string()
		.trim()
		.url(message)
		.refine((u) => u.startsWith('http://') || u.startsWith('https://'), message);

const schema = z.object({
	demoUrl: urlField('Enter a valid demo link (including https://)'),
	repoUrl: urlField('Enter a valid repository link (including https://)')
});

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
		const ctx = await requireProjectCtx(locals, params.slug);

		const form = await request.formData();
		const raw = {
			demoUrl: String(form.get('demoUrl') ?? ''),
			repoUrl: String(form.get('repoUrl') ?? '')
		};
		const parsed = schema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message, values: raw });
		}

		await prisma.project.update({
			where: { id: ctx.project.id },
			data: {
				demoUrl: parsed.data.demoUrl,
				repoUrl: parsed.data.repoUrl,
				currentStep: Math.max(ctx.project.currentStep, 4)
			}
		});
		redirect(302, `/e/${params.slug}/submit/hours`);
	}
};
