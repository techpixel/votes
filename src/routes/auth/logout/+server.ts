import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(302, '/login');
};
