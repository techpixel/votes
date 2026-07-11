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
			<Card.Title>Event admins</Card.Title>
			<Card.Description>
				Event admins can manage this event only. Superadmins (set via the <code>ADMIN_EMAILS</code>
				env var) can manage every event and aren't editable here.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/grant" use:enhance class="flex flex-wrap items-end gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="email">Email</Label>
					<Input id="email" name="email" type="email" placeholder="teammate@hackclub.com" class="w-72" required />
				</div>
				<Button type="submit">Grant access</Button>
			</form>
			{#if form?.granted}
				<p class="mt-3 text-sm text-muted-foreground">Granted admin to {form.granted}.</p>
			{/if}
			{#if form?.revoked}
				<p class="mt-3 text-sm text-muted-foreground">Revoked {form.revoked}.</p>
			{/if}
			{#if form?.message}
				<p class="mt-3 text-sm text-destructive">{form.message}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Who has access</Card.Title>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Email</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head class="w-20"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.superadmins as email (email)}
						<Table.Row>
							<Table.Cell class="font-medium">{email}</Table.Cell>
							<Table.Cell><Badge variant="outline">superadmin · all events</Badge></Table.Cell>
							<Table.Cell></Table.Cell>
						</Table.Row>
					{/each}
					{#each data.eventAdmins as a (a.email)}
						<Table.Row>
							<Table.Cell class="font-medium">{a.email}</Table.Cell>
							<Table.Cell><Badge variant="secondary">event admin</Badge></Table.Cell>
							<Table.Cell>
								<form method="POST" action="?/revoke" use:enhance>
									<input type="hidden" name="email" value={a.email} />
									<Button type="submit" variant="ghost" size="sm" class="text-destructive">
										Revoke
									</Button>
								</form>
							</Table.Cell>
						</Table.Row>
					{/each}
					{#if data.eventAdmins.length === 0}
						<Table.Row>
							<Table.Cell colspan={3} class="text-center text-muted-foreground">
								No event admins yet — superadmins still have full access.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
