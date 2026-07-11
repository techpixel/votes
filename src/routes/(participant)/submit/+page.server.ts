import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user);
	if (!ctx) redirect(302, '/');
	redirect(302, flowDestination(ctx));
};
