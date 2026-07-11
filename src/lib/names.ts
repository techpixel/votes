/** "Manitej Boorgu" → "Manitej B." — emails and full last names stay private. */
export function shortName(firstName: string | null, lastName: string | null): string {
	const first = (firstName ?? '').trim();
	const initial = (lastName ?? '').trim().charAt(0);
	return `${first}${initial ? ` ${initial.toUpperCase()}.` : ''}`.trim();
}
