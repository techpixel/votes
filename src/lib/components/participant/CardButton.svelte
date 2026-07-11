<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		href,
		type = 'submit',
		disabled = false,
		onclick
	}: {
		children: Snippet;
		href?: string;
		type?: 'submit' | 'button';
		disabled?: boolean;
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const classes =
		'flex h-[52px] w-full items-center justify-center overflow-clip rounded-2xl border-2 px-6 text-base font-medium backdrop-blur-[15px] transition-colors';
</script>

{#if href && !disabled}
	<a {href} class="{classes} border-cream text-white hover:bg-white/10">
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{onclick}
		{disabled}
		class="{classes} {disabled
			? 'cursor-not-allowed border-white/30 text-white/40'
			: 'cursor-pointer border-cream text-white hover:bg-white/10'}"
	>
		{@render children()}
	</button>
{/if}
