<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';

	let { data } = $props();

	const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Results</Card.Title>
		<Card.Description>
			{data.totalVoters}
			{data.totalVoters === 1 ? 'participant has' : 'participants have'} voted.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-16">Rank</Table.Head>
					<Table.Head>Project</Table.Head>
					<Table.Head>Team</Table.Head>
					<Table.Head class="text-right">Votes</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.ranked as p, i (p.id)}
					<Table.Row>
						<Table.Cell class="text-lg">{medal(i)}</Table.Cell>
						<Table.Cell class="font-medium">{p.name}</Table.Cell>
						<Table.Cell class="text-sm">{p.members.join(', ')}</Table.Cell>
						<Table.Cell class="text-right text-lg font-semibold">{p.votes}</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={4} class="text-center text-muted-foreground">
							No submitted projects yet
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content>
</Card.Root>
