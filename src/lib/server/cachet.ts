const CACHET_BASE = 'https://cachet.dunkirk.sh';

/**
 * Cachet (https://cachet.dunkirk.sh) caches Slack profile data; GET /users/:id
 * returns { displayName, pronouns, imageUrl }. There is no bulk endpoint, so we
 * memoize per-ID in memory — display names change rarely and search hits the
 * same event roster repeatedly.
 */
const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { displayName: string | null; expires: number }>();

async function fetchDisplayName(slackId: string): Promise<string | null> {
	try {
		const res = await fetch(`${CACHET_BASE}/users/${encodeURIComponent(slackId)}`);
		if (!res.ok) return null;
		const data = await res.json();
		return typeof data.displayName === 'string' && data.displayName ? data.displayName : null;
	} catch {
		return null;
	}
}

/** Resolves Slack IDs to display names. Unknown/failed IDs map to null. */
export async function getDisplayNames(slackIds: string[]): Promise<Map<string, string | null>> {
	const now = Date.now();
	const result = new Map<string, string | null>();
	const misses: string[] = [];

	for (const id of new Set(slackIds)) {
		const hit = cache.get(id);
		if (hit && hit.expires > now) result.set(id, hit.displayName);
		else misses.push(id);
	}

	await Promise.all(
		misses.map(async (id) => {
			const displayName = await fetchDisplayName(id);
			// Cache failures too (shorter TTL) so a bad ID doesn't refetch every search.
			cache.set(id, { displayName, expires: now + (displayName ? TTL_MS : TTL_MS / 12) });
			result.set(id, displayName);
		})
	);

	return result;
}

export async function getDisplayName(slackId: string | null): Promise<string | null> {
	if (!slackId) return null;
	return (await getDisplayNames([slackId])).get(slackId) ?? null;
}
