import type { LayoutServerLoad } from './$types';

// Platform-default branding for the login screen and the event picker, where
// there's no single event in context. Event-scoped pages under /e/[slug]
// override these with the event's own logo/background. The background is the
// blurred art behind each flow/project card.
const DEFAULT_LOGO = '/brand/crux-logo.webp';
const DEFAULT_BACKGROUND = '/brand/card-art.webp';

export const load: LayoutServerLoad = () => {
	return { logoUrl: DEFAULT_LOGO, backgroundUrl: DEFAULT_BACKGROUND };
};
