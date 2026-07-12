import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');
	if (ctx.event.stage !== 'CLOSED') redirect(302, flowDestination(ctx));
};
