import { env } from '$env/dynamic/private';
import { prisma } from './db';

const API_BASE = 'https://api.airtable.com/v0';
const BATCH_SIZE = 10;

type AirtableFields = Record<string, unknown>;

async function airtableRequest(
	method: 'POST' | 'PATCH' | 'DELETE',
	baseId: string,
	tableId: string,
	body?: unknown,
	query?: string
): Promise<{ records?: { id: string }[] }> {
	const url = `${API_BASE}/${baseId}/${tableId}${query ? `?${query}` : ''}`;
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < 3; attempt++) {
		if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
		try {
			const res = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
					...(body ? { 'Content-Type': 'application/json' } : {})
				},
				body: body ? JSON.stringify(body) : undefined
			});
			if (res.ok) return res.json();
			const text = await res.text();
			lastError = new Error(`Airtable ${method} failed (${res.status}): ${text.slice(0, 300)}`);
			// Only retry rate limits and server errors.
			if (res.status !== 429 && res.status < 500) break;
		} catch (e) {
			lastError = e instanceof Error ? e : new Error(String(e));
		}
	}
	throw lastError ?? new Error('Airtable request failed');
}

function splitName(fullName: string | null): { first: string; last: string } {
	if (!fullName) return { first: '', last: '' };
	const parts = fullName.trim().split(/\s+/);
	return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

/**
 * Mirrors a submitted project into Airtable: one record per team member.
 * Creates missing records, PATCHes existing ones, and stores sync status
 * on each member's AirtableRecord row. Never throws — errors land in syncError.
 */
export async function syncProjectToAirtable(projectId: string): Promise<void> {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: {
			event: true,
			team: { include: { members: { include: { participant: { include: { user: true } } } } } }
		}
	});
	if (!project || !project.submittedAt) return;

	const { airtableBaseId, airtableTableId } = project.event;
	if (!env.AIRTABLE_API_KEY || !airtableBaseId || !airtableTableId) {
		console.warn('[airtable] skipping sync — API key or base/table not configured');
		return;
	}

	// Attachments need a publicly fetchable URL.
	const screenshotAttachment =
		project.screenshotUrl?.startsWith('https://') ? [{ url: project.screenshotUrl }] : undefined;

	const jobs = project.team.members.map((member) => {
		const p = member.participant;
		const fromUser = splitName(p.user?.name ?? null);
		const fields: AirtableFields = {
			'First Name': p.firstName || fromUser.first,
			'Last Name': p.lastName || fromUser.last,
			Email: p.email,
			'Code URL': project.repoUrl ?? '',
			'Playable URL': project.demoUrl ?? '',
			Description: project.description,
			'Optional - Override Hours Spent': member.hoursEstimate ?? undefined,
			'Hackatime Projects': member.hackatimeProjects.join(', ')
		};
		if (screenshotAttachment) fields['Screenshot'] = screenshotAttachment;
		return { member, fields };
	});

	// Ensure a tracking row exists per member.
	for (const { member } of jobs) {
		await prisma.airtableRecord.upsert({
			where: { teamMemberId: member.id },
			update: { projectId: project.id },
			create: { projectId: project.id, teamMemberId: member.id }
		});
	}
	const tracking = await prisma.airtableRecord.findMany({
		where: { teamMemberId: { in: jobs.map((j) => j.member.id) } }
	});
	const trackingByMember = new Map(tracking.map((t) => [t.teamMemberId, t]));

	const toCreate = jobs.filter((j) => !trackingByMember.get(j.member.id)?.airtableRecordId);
	const toUpdate = jobs.filter((j) => trackingByMember.get(j.member.id)?.airtableRecordId);

	// Creates, in batches of 10.
	for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
		const batch = toCreate.slice(i, i + BATCH_SIZE);
		try {
			const res = await airtableRequest('POST', airtableBaseId, airtableTableId, {
				records: batch.map((j) => ({ fields: j.fields })),
				typecast: true
			});
			await Promise.all(
				batch.map((j, idx) =>
					prisma.airtableRecord.update({
						where: { teamMemberId: j.member.id },
						data: {
							airtableRecordId: res.records?.[idx]?.id,
							lastSyncedAt: new Date(),
							syncError: null
						}
					})
				)
			);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			console.error('[airtable] create failed:', message);
			await prisma.airtableRecord.updateMany({
				where: { teamMemberId: { in: batch.map((j) => j.member.id) } },
				data: { syncError: message }
			});
		}
	}

	// Updates, in batches of 10.
	for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
		const batch = toUpdate.slice(i, i + BATCH_SIZE);
		try {
			await airtableRequest('PATCH', airtableBaseId, airtableTableId, {
				records: batch.map((j) => ({
					id: trackingByMember.get(j.member.id)!.airtableRecordId!,
					fields: j.fields
				})),
				typecast: true
			});
			await prisma.airtableRecord.updateMany({
				where: { teamMemberId: { in: batch.map((j) => j.member.id) } },
				data: { lastSyncedAt: new Date(), syncError: null }
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			console.error('[airtable] update failed:', message);
			await prisma.airtableRecord.updateMany({
				where: { teamMemberId: { in: batch.map((j) => j.member.id) } },
				data: { syncError: message }
			});
		}
	}
}

/** Deletes the Airtable records for members being removed from a team. */
export async function deleteAirtableRecords(
	baseId: string | null,
	tableId: string | null,
	airtableRecordIds: string[]
): Promise<void> {
	if (!env.AIRTABLE_API_KEY || !baseId || !tableId || airtableRecordIds.length === 0) return;
	for (let i = 0; i < airtableRecordIds.length; i += BATCH_SIZE) {
		const batch = airtableRecordIds.slice(i, i + BATCH_SIZE);
		const query = batch.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
		try {
			await airtableRequest('DELETE', baseId, tableId, undefined, query);
		} catch (e) {
			console.error('[airtable] delete failed:', e);
		}
	}
}
