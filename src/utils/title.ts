const titleBreakPattern = /<br\s*\/?>/gi;

export function titleToPlainText(title: string) {
	return title.replace(titleBreakPattern, ' ').replace(/\s+/g, ' ').trim();
}
