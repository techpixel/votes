import { redirect } from '@sveltejs/kit';
import { getEligibleEvents, getParticipantContext, flowDestination } from '$lib/server/flow';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const events = await getEligibleEvents(locals.user);

	// Signed in but not on any event's participant list.
	if (events.length === 0) {
		return { registered: false, email: locals.user.email, events: [] };
	}

	// A single event skips the picker — drop straight into its flow.
	if (events.length === 1) {
		const ctx = await getParticipantContext(locals.user, events[0].slug);
		if (ctx) redirect(302, flowDestination(ctx));
	}

	// Multiple events: let the participant choose which one to work in.
	return { registered: true, email: locals.user.email, events };
};
