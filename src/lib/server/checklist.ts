import { parse as parseYaml } from 'yaml';
import raw from '../../../checklist.yaml?raw';

/**
 * The pre-submission checklist is hardcoded in checklist.yaml at the repo
 * root (inlined at build time). Events snapshot it into their checklistItems
 * column on creation.
 */
function loadChecklist(): string[] {
	const parsed = parseYaml(raw);
	if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
		throw new Error('checklist.yaml must be a YAML list of strings');
	}
	return parsed.map((item) => item.trim()).filter(Boolean);
}

export const CHECKLIST_ITEMS = loadChecklist();
