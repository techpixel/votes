import { redirect } from '@sveltejs/kit';
import { getParticipantContext } from '$lib/server/flow';
import type { LayoutServerLoad } from './$types';

// Platform fallbacks when an event hasn't set its own branding. The background
// is the blurred art behind each flow/project card.
const DEFAULT_LOGO = '/brand/crux-logo.webp';
const DEFAULT_BACKGROUND = '/brand/card-art.webp';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');
	// Anyone hitting an event they're not a participant of goes back to the picker.
	const ctx = await getParticipantContext(locals.user, params.slug);
	if (!ctx) redirect(302, '/');

	return {
		logoUrl: ctx.event.logoUrl || DEFAULT_LOGO,
		backgroundUrl: ctx.event.backgroundUrl || DEFAULT_BACKGROUND
	};
};
