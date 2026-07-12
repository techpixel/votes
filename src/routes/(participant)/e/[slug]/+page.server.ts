import { redirect } from '@sveltejs/kit';
import { getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

// `/e/[slug]` has no page of its own — send the participant to wherever they
// belong in this event's flow.
export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');
	redirect(302, flowDestination(ctx));
};
