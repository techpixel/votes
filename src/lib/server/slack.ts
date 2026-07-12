import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';

/**
 * Resolves Slack IDs to display names via the Slack API (users.info, needs a
 * bot token with the users:read scope). We use profile.display_name — the
 * name Slack renders in the client — falling back to profile.real_name when
 * the user hasn't set one, exactly as Slack does. Never user.name: that's the
 * legacy username/handle, not a display name.
 *
 * users.info is per-user (no bulk endpoint), so lookups are cached in two
 * layers: an in-memory map for the request-hot path, and the participant row
 * (slackDisplayName + slackDisplayNameSyncedAt) so names survive restarts and
 * the gallery never hammers the Slack API. A stale DB name also serves as the
 * fallback when the Slack API is unreachable.
 */
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour
const DB_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const cache = new Map<string, { displayName: string | null; expires: number }>();

async function fetchDisplayName(slackId: string): Promise<string | null> {
	if (!env.SLACK_BOT_TOKEN) return null;
	try {
		const res = await fetch(
			`https://slack.com/api/users.info?user=${encodeURIComponent(slackId)}`,
			{ headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` } }
		);
		if (!res.ok) return null;
		const data = await res.json();
		if (!data.ok) return null;
		const profile = data.user?.profile;
		const name = profile?.display_name || profile?.real_name;
		return typeof name === 'string' && name ? name : null;
	} catch {
		return null;
	}
}

/** Resolves Slack IDs to display names. Unknown/failed IDs map to null. */
export async function getDisplayNames(slackIds: string[]): Promise<Map<string, string | null>> {
	const now = Date.now();
	const result = new Map<string, string | null>();
	let misses: string[] = [];

	for (const id of new Set(slackIds)) {
		const hit = cache.get(id);
		if (hit && hit.expires > now) result.set(id, hit.displayName);
		else misses.push(id);
	}
	if (!misses.length) return result;

	// DB layer: fresh rows resolve the miss; stale rows are kept as a fallback
	// in case the Slack API fetch fails.
	const rows = await prisma.participant.findMany({
		where: { slackId: { in: misses }, slackDisplayName: { not: null } },
		select: { slackId: true, slackDisplayName: true, slackDisplayNameSyncedAt: true }
	});
	const staleNames = new Map<string, string>();
	for (const row of rows) {
		const syncedAt = row.slackDisplayNameSyncedAt?.getTime() ?? 0;
		if (now - syncedAt < DB_TTL_MS) {
			cache.set(row.slackId!, { displayName: row.slackDisplayName, expires: now + MEMORY_TTL_MS });
			result.set(row.slackId!, row.slackDisplayName);
		} else {
			staleNames.set(row.slackId!, row.slackDisplayName!);
		}
	}
	misses = misses.filter((id) => !result.has(id));

	await Promise.all(
		misses.map(async (id) => {
			const fetched = await fetchDisplayName(id);
			if (fetched) {
				// Write-through so every participant row with this slackId stays warm.
				await prisma.participant
					.updateMany({
						where: { slackId: id },
						data: { slackDisplayName: fetched, slackDisplayNameSyncedAt: new Date(now) }
					})
					.catch(() => {});
			}
			// On fetch failure fall back to the stale DB name (don't clobber it).
			const displayName = fetched ?? staleNames.get(id) ?? null;
			// Cache failures too (shorter TTL) so a bad ID doesn't refetch every search.
			cache.set(id, {
				displayName,
				expires: now + (displayName ? MEMORY_TTL_MS : MEMORY_TTL_MS / 12)
			});
			result.set(id, displayName);
		})
	);

	return result;
}

export async function getDisplayName(slackId: string | null): Promise<string | null> {
	if (!slackId) return null;
	return (await getDisplayNames([slackId])).get(slackId) ?? null;
}
