<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Upload participants CSV</Card.Title>
			<Card.Description>
				Needs an <code>email</code> column; <code>first name</code> / <code>last name</code> (or a
				single <code>name</code>) columns are optional. Existing emails are skipped. Participants
				sign in with Hack Club using these emails.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				use:enhance
				class="flex flex-wrap items-center gap-3"
			>
				<input
					type="file"
					name="file"
					accept=".csv,text/csv"
					required
					class="text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium"
				/>
				<Button type="submit">Upload</Button>
			</form>
			{#if form?.uploaded}
				<p class="mt-3 text-sm">
					Added <strong>{form.uploaded.added}</strong>, skipped
					<strong>{form.uploaded.skipped}</strong> duplicates{#if form.uploaded.invalidCount},
						<strong class="text-destructive">{form.uploaded.invalidCount}</strong> invalid rows{/if}.
				</p>
				{#if form.uploaded.invalid.length}
					<ul class="mt-1 text-xs text-muted-foreground">
						{#each form.uploaded.invalid as row (row)}
							<li class="truncate">· {row}</li>
						{/each}
					</ul>
				{/if}
			{/if}
			{#if form?.message}
				<p class="mt-3 text-sm text-destructive">{form.message}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Participants ({data.participants.length})</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<form method="POST" action="?/add" use:enhance class="flex flex-wrap items-end gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" placeholder="orpheus@hackclub.com" class="w-64" required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="firstName">First name</Label>
					<Input id="firstName" name="firstName" class="w-36" />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="lastName">Last name</Label>
					<Input id="lastName" name="lastName" class="w-36" />
				</div>
				<Button type="submit" variant="outline">Add participant</Button>
			</form>

			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Email</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="w-20"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.participants as p (p.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{p.email}</Table.Cell>
							<Table.Cell>{p.name || '—'}</Table.Cell>
							<Table.Cell>
								<div class="flex gap-1.5">
									{#if p.signedUp}<Badge variant="secondary">signed up</Badge>{/if}
									{#if p.onTeam}<Badge variant="secondary">on a team</Badge>{/if}
									{#if !p.signedUp && !p.onTeam}<span class="text-xs text-muted-foreground">invited</span>{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<form
									method="POST"
									action="?/remove"
									use:enhance
									onsubmit={(e) => {
										if (p.onTeam && !confirm(`${p.email} is on a team — removing them also removes their team membership. Continue?`)) {
											e.preventDefault();
										}
									}}
								>
									<input type="hidden" name="id" value={p.id} />
									<Button type="submit" variant="ghost" size="sm" class="text-destructive">
										Remove
									</Button>
								</form>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={4} class="text-center text-muted-foreground">
								No participants yet — upload a CSV to get started
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
