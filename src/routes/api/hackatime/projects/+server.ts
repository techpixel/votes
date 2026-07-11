import { error, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireProjectCtx } from '$lib/server/submit-guard';
import type { RequestHandler } from './$types';

/** Suggests Hackatime project names for a teammate (identified by Slack ID). */
export const GET: RequestHandler = async ({ locals, url, fetch }) => {
	const ctx = await requireProjectCtx(locals);

	const participantId = url.searchParams.get('participantId');
	if (!participantId) error(400, 'participantId required');
	if (!ctx.team.members.some((m) => m.participantId === participantId)) {
		error(403, 'Not on your team');
	}

	const participant = await prisma.participant.findUnique({
		where: { id: participantId },
		include: { user: true }
	});
	const slackId = participant?.user?.slackId;
	if (!slackId) return json({ projects: [] });

	try {
		const res = await fetch(
			`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(slackId)}/stats?features=projects`
		);
		if (!res.ok) return json({ projects: [] });
		const data = await res.json();
		const projects = (data?.data?.projects ?? [])
			.filter((p: { name?: string }) => p.name)
			.slice(0, 25)
			.map((p: { name: string; total_seconds?: number }) => ({
				name: p.name,
				hours: Math.round(((p.total_seconds ?? 0) / 3600) * 10) / 10
			}));
		return json({ projects });
	} catch {
		return json({ projects: [] });
	}
};
