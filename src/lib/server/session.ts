import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { prisma } from './db';
import type { User } from '../../generated/prisma/client';

const SESSION_COOKIE = 'session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RENEWAL_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // renew when < 15 days left

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(cookies: Cookies, userId: string): Promise<void> {
	const token = randomBytes(32).toString('base64url');
	await prisma.session.create({
		data: {
			id: hashToken(token),
			userId,
			expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
		}
	});
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_DURATION_MS / 1000
	});
}

export async function validateSession(cookies: Cookies): Promise<User | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;

	const session = await prisma.session.findUnique({
		where: { id: hashToken(token) },
		include: { user: true }
	});
	if (!session) return null;

	if (session.expiresAt < new Date()) {
		await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		return null;
	}

	if (session.expiresAt.getTime() - Date.now() < RENEWAL_THRESHOLD_MS) {
		await prisma.session.update({
			where: { id: session.id },
			data: { expiresAt: new Date(Date.now() + SESSION_DURATION_MS) }
		});
	}

	return session.user;
}

export async function destroySession(cookies: Cookies): Promise<void> {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		await prisma.session.deleteMany({ where: { id: hashToken(token) } });
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
