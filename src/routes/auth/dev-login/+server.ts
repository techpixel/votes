import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { signIn } from '$lib/server/hackclub-auth';
import { createSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

/** Dev-only bypass: /auth/dev-login?email=... signs in as that email without OAuth. */
export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!dev) error(404, 'Not found');

	const email = url.searchParams.get('email')?.toLowerCase().trim();
	if (!email) error(400, 'Pass ?email=');

	const participant = await prisma.participant.findFirst({ where: { email } });
	const user = await signIn(
		{
			id: `dev-${email}`,
			email,
			name: participant ? `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim() : email.split('@')[0],
			slackId: null
		},
		{ access_token: 'dev' }
	);
	await createSession(cookies, user.id);
	redirect(302, '/');
};
