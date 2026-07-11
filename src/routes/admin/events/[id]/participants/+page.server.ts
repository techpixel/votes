import { fail } from '@sveltejs/kit';
import Papa from 'papaparse';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = async ({ params }) => {
	const participants = await prisma.participant.findMany({
		where: { eventId: params.id },
		orderBy: { email: 'asc' },
		include: {
			user: { select: { id: true } },
			teamMember: { select: { teamId: true } }
		}
	});
	return {
		participants: participants.map((p) => ({
			id: p.id,
			email: p.email,
			name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
			signedUp: !!p.user,
			onTeam: !!p.teamMember
		}))
	};
};

function pick(row: Record<string, string>, ...keys: string[]): string {
	for (const key of Object.keys(row)) {
		const norm = key.toLowerCase().replace(/[^a-z]/g, '');
		if (keys.includes(norm)) return (row[key] ?? '').trim();
	}
	return '';
}

export const actions: Actions = {
	upload: async ({ params, request }) => {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Choose a CSV file to upload.' });
		}

		const text = await file.text();
		const parsed = Papa.parse<Record<string, string>>(text, {
			header: true,
			skipEmptyLines: true
		});

		let added = 0;
		let skipped = 0;
		const invalid: string[] = [];

		for (const row of parsed.data) {
			const email = pick(row, 'email', 'emailaddress').toLowerCase();
			if (!EMAIL_RE.test(email)) {
				const raw = Object.values(row).join(',').slice(0, 60);
				if (raw.trim()) invalid.push(raw);
				continue;
			}
			const fullName = pick(row, 'name', 'fullname');
			const firstName = pick(row, 'firstname', 'first') || fullName.split(/\s+/)[0] || null;
			const lastName =
				pick(row, 'lastname', 'last') || fullName.split(/\s+/).slice(1).join(' ') || null;

			const result = await prisma.participant.createMany({
				data: [{ eventId: params.id, email, firstName, lastName }],
				skipDuplicates: true
			});
			if (result.count > 0) added++;
			else skipped++;
		}

		return {
			uploaded: {
				added,
				skipped,
				invalid: invalid.slice(0, 10),
				invalidCount: invalid.length
			}
		};
	},

	add: async ({ params, request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').toLowerCase().trim();
		if (!EMAIL_RE.test(email)) return fail(400, { message: 'Enter a valid email.' });

		const result = await prisma.participant.createMany({
			data: [
				{
					eventId: params.id,
					email,
					firstName: String(form.get('firstName') ?? '').trim() || null,
					lastName: String(form.get('lastName') ?? '').trim() || null
				}
			],
			skipDuplicates: true
		});
		if (result.count === 0) return fail(400, { message: `${email} is already registered.` });
		return { added: email };
	},

	remove: async ({ params, request }) => {
		const form = await request.formData();
		const id = String(form.get('id'));
		await prisma.participant.deleteMany({ where: { id, eventId: params.id } });
		return { removed: true };
	}
};
