import { error, redirect } from '@sveltejs/kit';
import { exchangeCode, fetchIdentity, signIn } from '$lib/server/hackclub-auth';
import { createSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const expectedState = cookies.get('oauth_state');
	cookies.delete('oauth_state', { path: '/' });

	if (!code || !state || !expectedState || state !== expectedState) {
		error(400, 'Invalid OAuth callback. Please try signing in again.');
	}

	const tokens = await exchangeCode(code);
	const identity = await fetchIdentity(tokens.access_token);
	const user = await signIn(identity, tokens);
	await createSession(cookies, user.id);

	redirect(302, '/');
};
