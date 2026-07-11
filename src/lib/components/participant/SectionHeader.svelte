<script lang="ts">
	let { title, subtitle }: { title: string; subtitle?: string } = $props();
</script>

<div class="flex flex-col gap-1.5">
	<h1 class="text-2xl font-semibold text-white">{title}</h1>
	{#if subtitle}
		<p class="text-base text-[#e6e6e6]">{subtitle}</p>
	{/if}
</div>
