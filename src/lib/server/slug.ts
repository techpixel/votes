/** Normalizes a string into a URL-safe event slug (lowercase, [a-z0-9-]). */
export function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
