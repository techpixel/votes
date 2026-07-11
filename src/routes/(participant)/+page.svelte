<script lang="ts">
	import FlowCard from '$lib/components/participant/FlowCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Horizons Crux</title>
</svelte:head>

<FlowCard>
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
		<h1 class="text-2xl font-bold">You're not on the list… yet!</h1>
		<p class="text-sm text-white/80">
			<span class="font-semibold">{data.email}</span> isn't registered for this event. Make sure you
			sign in with the email you registered with, or ask an organizer to add you.
		</p>
		<form method="POST" action="/auth/logout">
			<button
				type="submit"
				class="mt-4 cursor-pointer rounded-2xl border-2 border-cream bg-black/40 px-6 py-3 font-semibold backdrop-blur-[15px] transition-colors hover:bg-white/10"
			>
				Sign out
			</button>
		</form>
	</div>
</FlowCard>
