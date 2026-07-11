import { error, json } from '@sveltejs/kit';
import { uploadToCdn } from '$lib/server/cdn';
import { requireProjectCtx } from '$lib/server/submit-guard';
import type { RequestHandler } from './$types';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireProjectCtx(locals);

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file provided');
	if (!file.type.startsWith('image/')) error(400, 'Screenshot must be an image');
	if (file.size > MAX_SIZE) error(400, 'Screenshot must be under 10 MB');

	try {
		const url = await uploadToCdn(file);
		return json({ url });
	} catch (e) {
		console.error('[screenshot] upload failed:', e);
		error(502, 'Upload failed — please try again');
	}
};
