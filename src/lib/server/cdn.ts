import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * Uploads a file to Hack Club CDN and returns its public URL.
 * In dev without a token, falls back to writing into static/uploads.
 */
export async function uploadToCdn(file: File): Promise<string> {
	if (env.HACKCLUB_CDN_TOKEN) {
		const form = new FormData();
		form.append('file', file, file.name);
		const res = await fetch('https://cdn.hackclub.com/api/v4/upload', {
			method: 'POST',
			headers: { Authorization: `Bearer ${env.HACKCLUB_CDN_TOKEN}` },
			body: form
		});
		if (!res.ok) {
			throw new Error(`CDN upload failed (${res.status}): ${await res.text()}`);
		}
		const data = await res.json();
		const url = data.url ?? data.cdnUrl ?? data.deployedUrl ?? data.file?.url;
		if (!url) throw new Error(`CDN upload returned no URL: ${JSON.stringify(data).slice(0, 300)}`);
		return url;
	}

	if (!dev) {
		throw new Error('HACKCLUB_CDN_TOKEN is not configured');
	}

	// Dev fallback: serve from static/uploads via Vite.
	const ext = path.extname(file.name) || '.png';
	const name = `${randomBytes(8).toString('hex')}${ext}`;
	const dir = path.resolve('static/uploads');
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
	console.warn('[cdn] HACKCLUB_CDN_TOKEN not set — saved screenshot locally to static/uploads');
	return `/uploads/${name}`;
}
