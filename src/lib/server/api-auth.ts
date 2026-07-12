import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Guards the external HTTP API (bearer key in the Authorization header,
 * compared against VOTES_API_KEY). Throws 503 when the key is unconfigured so
 * the API fails closed, and 401 when the caller's key is missing or wrong.
 */
export function requireApiKey(request: Request): void {
	const expected = env.VOTES_API_KEY;
	if (!expected) error(503, 'API is not configured');

	const header = request.headers.get('authorization') ?? '';
	const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
	// timingSafeEqual requires equal-length buffers; the length check leaks
	// only the key's length.
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		error(401, 'Invalid or missing API key');
	}
}
