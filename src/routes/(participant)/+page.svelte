<script lang="ts">
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';

	let { data } = $props();

	const STAGE_LABEL: Record<string, string> = {
		DRAFT: 'Coming soon',
		SUBMISSION: 'Submissions open',
		VOTING: 'Voting open',
		CLOSED: 'Closed'
	};
</script>

<svelte:head>
	<title>Choose your event · Horizons Crux</title>
</svelte:head>

{#if !data.registered}
	<FlowCard>
		<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
			<h1 class="text-2xl font-bold">You're not on the list… yet!</h1>
			<p class="text-sm text-white/80">
				<span class="font-semibold">{data.email}</span> isn't registered for this event. Make sure you
				sign in with the email you registered with, or ask an organizer to add you.
			</p>
			<form method="POST" action="/auth/logout" class="mt-4 w-full">
				<CardButton>Sign out</CardButton>
			</form>
		</div>
	</FlowCard>
{:else}
	<div class="flex w-full flex-col items-center gap-8">
		<h1 class="text-center text-3xl font-bold">Choose your event</h1>
		<div class="flex max-w-full flex-wrap justify-center gap-6">
			{#each data.events as event (event.slug)}
				<a
					href="/e/{event.slug}"
					class="group relative block h-[440px] w-[300px] max-w-full shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl transition-all duration-200 hover:scale-[1.03] hover:border-cream"
				>
					<img
						src={event.backgroundUrl ?? '/brand/card-art.webp'}
						alt=""
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
					<div
						class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85"
						aria-hidden="true"
					></div>
					<div class="relative flex h-full flex-col items-center gap-3 p-6 text-center">
						<img
							src={event.logoUrl ?? '/brand/crux-logo.webp'}
							alt=""
							class="h-16 w-auto max-w-[85%] object-contain drop-shadow-lg"
						/>
						<div class="mt-auto flex flex-col gap-1.5">
							<h2 class="text-xl font-bold text-white drop-shadow-md">{event.name}</h2>
							{#if event.tagline}
								<p class="text-sm text-white/90 drop-shadow">{event.tagline}</p>
							{/if}
							<span
								class="mt-1 text-xs font-semibold tracking-wide text-white/70 uppercase drop-shadow"
							>
								{STAGE_LABEL[event.stage] ?? event.stage}
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
