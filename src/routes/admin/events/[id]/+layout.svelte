<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';

	let { data, children } = $props();
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{data.event.name}</h1>
		<Badge variant="outline">{data.event.stage}</Badge>
	</div>

	{@render children()}
</div>
