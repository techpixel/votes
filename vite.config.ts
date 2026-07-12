import { sentrySvelteKit } from '@sentry/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// Must come before the SvelteKit plugin. Uploads source maps to Sentry at build
		// time only when SENTRY_AUTH_TOKEN is present, so local/CI builds without it still work.
		sentrySvelteKit({
			sourceMapsUploadOptions: {
				org: 'hack-club-hcb',
				project: 'vote',
				authToken: process.env.SENTRY_AUTH_TOKEN
			}
		}),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node produces a standalone server (build/index.js) that Bun runs directly.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	]
});
