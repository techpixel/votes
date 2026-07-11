import { redirect } from '@sveltejs/kit';
import { getParticipantContext } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user);
	if (!ctx) redirect(302, '/');
	// Only for participants who missed the submission window: voting is on, nothing submitted.
	if (ctx.event.stage !== 'VOTING' || ctx.project?.submittedAt) redirect(302, '/');
};
