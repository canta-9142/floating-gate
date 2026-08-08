const ALERTS = {
	NOTE: { icon: 'ⓘ', label: 'Note' },
	TIP: { icon: '✦', label: 'Tip' },
	IMPORTANT: { icon: '❗', label: 'Important' },
	WARNING: { icon: '⚠', label: 'Warning' },
	CAUTION: { icon: '✖', label: 'Caution' },
};

const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:[ \t]*\n|[ \t]+|$)/i;

function hasVisibleContent(nodes) {
	return nodes.some((node) => node.type !== 'text' || node.value.trim().length > 0);
}

/**
 * Convert GitHub-style alert blockquotes into styled, accessible notices.
 *
 * @type {import('satteri').HastPluginDefinition}
 */
export const markdownAlerts = {
	name: 'markdown-alerts',
	element: {
		filter: ['blockquote'],
		visit(node) {
			const paragraphIndex = node.children.findIndex(
				(child) => child.type === 'element' && child.tagName === 'p',
			);
			const firstParagraph = node.children[paragraphIndex];

			if (!firstParagraph || firstParagraph.type !== 'element') return;

			const markerIndex = firstParagraph.children.findIndex(
				(child) => child.type !== 'text' || child.value.trim().length > 0,
			);
			const markerNode = firstParagraph.children[markerIndex];

			if (!markerNode || markerNode.type !== 'text') return;

			const marker = markerNode.value.match(ALERT_MARKER);
			if (!marker) return;

			const type = marker[1].toUpperCase();
			const alert = ALERTS[type];
			const paragraphChildren = [...firstParagraph.children];
			const remainingText = markerNode.value.slice(marker[0].length);

			if (remainingText.length > 0) {
				paragraphChildren[markerIndex] = { ...markerNode, value: remainingText };
			} else {
				paragraphChildren.splice(markerIndex, 1);
			}

			const children = [...node.children];
			if (hasVisibleContent(paragraphChildren)) {
				children[paragraphIndex] = { ...firstParagraph, children: paragraphChildren };
			} else {
				children.splice(paragraphIndex, 1);
			}

			children.splice(paragraphIndex, 0, {
				type: 'element',
				tagName: 'p',
				properties: { className: ['markdown-alert-title'] },
				children: [
					{
						type: 'element',
						tagName: 'span',
						properties: { ariaHidden: 'true', className: ['markdown-alert-icon'] },
						children: [{ type: 'text', value: alert.icon }],
					},
					{ type: 'text', value: alert.label },
				],
			});

			const existingClasses = Array.isArray(node.properties?.className)
				? node.properties.className
				: [];

			return {
				...node,
				properties: {
					...node.properties,
					className: [...existingClasses, 'markdown-alert'],
					dataAdmonition: type.toLowerCase(),
					role: 'note',
				},
				children,
			};
		},
	},
};
