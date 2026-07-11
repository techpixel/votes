<script lang="ts">
	import { enhance } from '$app/forms';
	import FlowCard from '$lib/components/participant/FlowCard.svelte';
	import SectionHeader from '$lib/components/participant/SectionHeader.svelte';
	import CardButton from '$lib/components/participant/CardButton.svelte';

	let { data, form } = $props();

	let name = $state(form?.values?.name ?? data.project?.name ?? '');
	let description = $state(form?.values?.description ?? data.project?.description ?? '');
	let screenshotUrl = $state(form?.values?.screenshotUrl ?? data.project?.screenshotUrl ?? '');
	let uploading = $state(false);
	let uploadError = $state('');
	let dragOver = $state(false);
	let fileInput: HTMLInputElement;

	async function upload(file: File) {
		uploading = true;
		uploadError = '';
		try {
			const body = new FormData();
			body.append('file', file);
			const res = await fetch('/api/screenshot', { method: 'POST', body });
			if (!res.ok) {
				uploadError = (await res.json().catch(() => null))?.message ?? 'Upload failed';
				return;
			}
			screenshotUrl = (await res.json()).url;
		} finally {
			uploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) upload(file);
	}

	function onPick(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) upload(file);
	}
</script>

<svelte:head>
	<title>Project details · Horizons Crux</title>
</svelte:head>

<FlowCard dim>
	<form method="POST" use:enhance class="flex h-full flex-col px-6 pt-9 pb-6">
		<SectionHeader
			title="Project Details"
			subtitle="Put down details about your project. What's your project about?"
		/>

		<div class="mt-7 flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label for="name" class="text-xs text-[#ccc]">Project Name ({name.length}/50)</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={name}
					maxlength={50}
					placeholder="Podium 3 Ultra"
					class="h-10 w-full rounded-xl border border-white bg-transparent px-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs text-[#ccc]">Screenshot</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*"
					class="hidden"
					onchange={onPick}
				/>
				<button
					type="button"
					onclick={() => fileInput.click()}
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
					class="relative flex h-[76px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white text-base transition-colors {dragOver
						? 'bg-white/20'
						: 'hover:bg-white/10'}"
				>
					{#if screenshotUrl}
						<img src={screenshotUrl} alt="Screenshot preview" class="absolute inset-0 h-full w-full object-cover opacity-60" />
						<span class="relative z-10 font-medium text-white">Click to replace</span>
					{:else if uploading}
						<span class="text-[#ccc]">Uploading…</span>
					{:else}
						<span class="text-[#ccc]">Drag and drop a screenshot</span>
					{/if}
				</button>
				{#if uploadError}
					<p class="text-xs text-red-400">{uploadError}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="description" class="text-xs text-[#ccc]">
					Description ({description.length}/500)
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={description}
					maxlength={500}
					rows={3}
					placeholder="This is a multiline"
					class="w-full resize-none rounded-xl border border-white bg-transparent px-3 py-3 text-base text-white placeholder-[#999] transition-shadow duration-150 focus:ring-1 focus:ring-inset focus:ring-white"
				></textarea>
			</div>
		</div>

		{#if form?.message}
			<p class="mt-3 text-sm text-red-400">{form.message}</p>
		{/if}

		<input type="hidden" name="screenshotUrl" value={screenshotUrl} />
		<div class="mt-auto pt-4">
			<CardButton disabled={uploading}>Next →</CardButton>
		</div>
	</form>
</FlowCard>
