<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';

	const origin = $derived(page.url.origin);

	const fields = [
		{
			field: 'name',
			type: 'string',
			required: 'Yes',
			description: 'Event name, 1–100 characters.'
		},
		{
			field: 'logoUrl',
			type: 'string',
			required: 'Yes',
			description: 'http(s) URL of the event logo, shown across participant pages.'
		},
		{
			field: 'backgroundUrl',
			type: 'string',
			required: 'Yes',
			description: 'http(s) URL of the event background image.'
		},
		{
			field: 'slug',
			type: 'string',
			required: 'No',
			description:
				'URL identifier, max 64 characters — also the Attend event slug. Normalized to lowercase a–z, 0–9 and dashes. Derived from name when omitted.'
		},
		{
			field: 'voteLimit',
			type: 'integer',
			required: 'No',
			description: 'Votes per participant, 1–50. Defaults to 3.'
		},
		{
			field: 'maxTeamSize',
			type: 'integer',
			required: 'No',
			description: 'Members per team, 1–20. Defaults to 3.'
		},
		{
			field: 'checklist',
			type: 'string',
			required: 'No',
			description:
				'YAML list of submission checklist items, e.g. "- Add a demo link". Defaults to no checklist.'
		}
	];

	const errors = [
		{
			status: '400',
			cause:
				'Malformed JSON, failed validation, invalid checklist YAML, or a slug with no alphanumeric characters.'
		},
		{ status: '401', cause: 'Missing or incorrect API key.' },
		{ status: '409', cause: 'An event with the same slug already exists.' },
		{ status: '503', cause: 'VOTE_API_KEY is not configured on the server.' }
	];

	const curlExample = $derived(`curl -X POST ${origin}/api/v1/events \\
  -H "Authorization: Bearer $VOTE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Scrapyard Austin",
    "logoUrl": "https://cdn.hackclub.com/example/logo.webp",
    "backgroundUrl": "https://cdn.hackclub.com/example/background.webp",
    "checklist": "- Add a demo link\\n- Upload a screenshot"
  }'`);

	const responseExample = $derived(`{
  "id": "cmcz1234567890abcdef",
  "name": "Scrapyard Austin",
  "slug": "scrapyard-austin",
  "stage": "DRAFT",
  "voteLimit": 3,
  "maxTeamSize": 3,
  "logoUrl": "https://cdn.hackclub.com/example/logo.webp",
  "backgroundUrl": "https://cdn.hackclub.com/example/background.webp",
  "checklistItems": ["Add a demo link", "Upload a screenshot"],
  "createdAt": "2026-07-11T00:00:00.000Z",
  "adminUrl": "${origin}/admin/events/cmcz1234567890abcdef",
  "galleryUrl": "${origin}/gallery/scrapyard-austin"
}`);
</script>

<svelte:head>
	<title>API · Vote Admin</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">API</h1>
		<p class="text-sm text-muted-foreground">
			Create vote events programmatically from external services like Attend.
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Authentication</Card.Title>
			<Card.Description>All API requests use a shared bearer key.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3 text-sm">
			<p>
				Send the key in the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
					>Authorization: Bearer &lt;key&gt;</code
				>
				header. The key is a single shared secret held by the operators and configured on the server via
				the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">VOTE_API_KEY</code>
				environment variable — it is never shown here.
			</p>
			<p class="text-muted-foreground">
				Until the key is configured, every request returns <span class="font-mono">503</span>.
			</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Badge>POST</Badge>
				<code class="font-mono text-sm">/api/v1/events</code>
			</Card.Title>
			<Card.Description>
				Creates a new event in the DRAFT stage and returns it with admin and gallery URLs.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium">Request body</h3>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Field</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head>Required</Table.Head>
							<Table.Head>Description</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each fields as f (f.field)}
							<Table.Row>
								<Table.Cell class="font-mono text-xs">{f.field}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{f.type}</Table.Cell>
								<Table.Cell>{f.required}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{f.description}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium">Example request</h3>
				<pre
					class="overflow-x-auto rounded-md border bg-muted px-4 py-3 font-mono text-xs leading-relaxed"><code
						>{curlExample}</code
					></pre>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium">Example response — 201 Created</h3>
				<pre
					class="overflow-x-auto rounded-md border bg-muted px-4 py-3 font-mono text-xs leading-relaxed"><code
						>{responseExample}</code
					></pre>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium">Errors</h3>
				<p class="text-sm text-muted-foreground">
					Errors are JSON objects with a <code
						class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">message</code
					> field.
				</p>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-24">Status</Table.Head>
							<Table.Head>Cause</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each errors as e (e.status)}
							<Table.Row>
								<Table.Cell class="font-mono text-xs">{e.status}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{e.cause}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
