// Dev-only helper: creates submitted projects for test participants and opens voting.
// Run: bunx tsx prisma/dev-seed-voting.ts
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
	const event = await prisma.event.findUniqueOrThrow({ where: { slug: 'horizons-crux' } });

	const demo = [
		{
			email: 'personb@example.com',
			project: {
				name: 'Waveform',
				description: 'A synthesizer in the browser that turns your typing rhythm into music.',
				demoUrl: 'https://waveform.example.com',
				repoUrl: 'https://github.com/personb/waveform'
			}
		},
		{
			email: 'personc@example.com',
			project: {
				name: 'Trailhead',
				description: 'Offline-first hiking maps with hand-drawn trail art and stamp collecting.',
				demoUrl: 'https://trailhead.example.com',
				repoUrl: 'https://github.com/personc/trailhead'
			}
		}
	];

	for (const d of demo) {
		const participant = await prisma.participant.findUniqueOrThrow({
			where: { eventId_email: { eventId: event.id, email: d.email } },
			include: { teamMember: true }
		});
		if (participant.teamMember) {
			console.log(`${d.email} already on a team, skipping`);
			continue;
		}
		await prisma.team.create({
			data: {
				eventId: event.id,
				createdByParticipantId: participant.id,
				members: { create: { participantId: participant.id, hoursEstimate: 10 } },
				project: {
					create: {
						eventId: event.id,
						...d.project,
						currentStep: 5,
						checklistCompletedAt: new Date(),
						submittedAt: new Date()
					}
				}
			}
		});
		console.log(`Created submitted project "${d.project.name}" for ${d.email}`);
	}

	await prisma.event.update({ where: { id: event.id }, data: { stage: 'VOTING' } });
	console.log('Event stage set to VOTING');
}

main()
	.then(() => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
