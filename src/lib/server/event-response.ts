import { env } from '$env/dynamic/private';
import type { Event } from '../../generated/prisma/client';

/** Resolves the public origin used to build admin/gallery URLs. */
export function resolveOrigin(requestUrl: URL): string {
	return (env.APP_ORIGIN || requestUrl.origin).trim().replace(/\/+$/, '');
}

/** Serializes an Event into the public API JSON shape shared by POST and GET. */
export function serializeEvent(event: Event, origin: string) {
	return {
		id: event.id,
		name: event.name,
		slug: event.slug,
		stage: event.stage,
		voteLimit: event.voteLimit,
		maxTeamSize: event.maxTeamSize,
		logoUrl: event.logoUrl,
		backgroundUrl: event.backgroundUrl,
		checklistItems: event.checklistItems,
		createdAt: event.createdAt.toISOString(),
		adminUrl: `${origin}/admin/events/${event.id}`,
		galleryUrl: `${origin}/gallery/${event.slug}`
	};
}
