import { error, redirect } from '@sveltejs/kit';
import { getAdminScope } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const scope = await getAdminScope(locals.user);
	if (!scope) error(404, 'Not found');

	return {
		adminEmail: scope.email,
		superadmin: scope.superadmin,
		events: scope.events
	};
};
