import { handleErrorWithSentry } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://1762380e90c252130ef738900c9c593f@o4509680631087104.ingest.us.sentry.io/4511720065138688',

	// Adjust this in production to control the volume of performance data collected.
	tracesSampleRate: 1.0,

	// Only send events when a DSN is configured (always true here, but keeps things explicit).
	enabled: true
});

// Reports errors thrown during client-side rendering / navigation to Sentry.
export const handleError = handleErrorWithSentry();
