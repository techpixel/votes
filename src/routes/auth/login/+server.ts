import { redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { authorizeUrl } from '$lib/server/hackclub-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const state = randomBytes(16).toString('base64url');
	cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600
	});
	redirect(302, authorizeUrl(state));
};
