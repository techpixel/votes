import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/session';

Sentry.init({
	dsn: 'https://1762380e90c252130ef738900c9c593f@o4509680631087104.ingest.us.sentry.io/4511720065138688',

	// Adjust this in production to control the volume of performance data collected.
	tracesSampleRate: 1.0
});

const authHandle: Handle = async ({ event, resolve }) => {
	event.locals.user = await validateSession(event.cookies);
	return resolve(event);
};

// sentryHandle() runs first so it can capture errors thrown by downstream handles.
export const handle = sequence(sentryHandle(), authHandle);

// Reports errors thrown during server-side rendering to Sentry.
export const handleError = handleErrorWithSentry();
