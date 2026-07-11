import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const ctx = await getParticipantContext(locals.user);
	if (!ctx) {
		// Signed in but not on any event's participant list.
		return { registered: false, email: locals.user.email };
	}

	redirect(302, flowDestination(ctx));
};
