const SIZE = /^(width|height)\s*=\s*((?:\d+(?:\.\d+)?|\.\d+)(?:px|%|em|rem)?|auto)$/;
const ALIGN = /^(align)\s*=\s*(left|center|right)$/;
const ALIGN_STYLES = {
	left: 'display:block;margin-left:0;margin-right:auto;',
	center: 'display:block;margin-left:auto;margin-right:auto;',
	right: 'display:block;margin-left:auto;margin-right:0;',
};

/** Apply display dimensions and alignment immediately after an image.
 * @type {import('satteri').HastPluginDefinition}
 */
export const markdownImageSizes = {
	name: 'markdown-image-sizes',
	element: {
		filter: ['img'],
		visit(node, ctx) {
			const parent = ctx.parent(node);
			const index = ctx.indexOf(node);
			if (!parent || index === undefined) return;
			const next = parent.children[index + 1];
			if (next?.type !== 'text') return;
			const block = next.value.match(/^\{([^{}\n]+)\}/);
			if (!block) return;

			const dimensions = new Map();
			for (const attribute of block[1].trim().split(/\s+(?=\S+\s*=)/)) {
				const match = attribute.match(SIZE) ?? attribute.match(ALIGN);
				if (!match || dimensions.has(match[1])) return;
				const value = /^\d*\.?\d+$/.test(match[2]) ? `${match[2]}px` : match[2];
				dimensions.set(match[1], value);
			}

			// Keep the intrinsic dimensions used by Astro's image optimization.
			const existingStyle = node.properties?.style;
			const style = typeof existingStyle === 'string' ? existingStyle : '';
			const sizeStyle = dimensions.has('width') || dimensions.has('height')
				? `width:${dimensions.get('width') ?? 'auto'};height:${dimensions.get('height') ?? 'auto'};`
				: '';
			const alignStyle = ALIGN_STYLES[dimensions.get('align')] ?? '';
			ctx.setProperty(node, 'style', `${style ? `${style};` : ''}${sizeStyle}${alignStyle}`);
			ctx.setProperty(next, 'value', next.value.slice(block[0].length));
		},
	},
};
