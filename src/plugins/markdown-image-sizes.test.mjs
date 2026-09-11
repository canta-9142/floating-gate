import assert from 'node:assert/strict';
import test from 'node:test';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { markdownAlerts } from './markdown-alerts.mjs';
import { markdownImageSizes } from './markdown-image-sizes.mjs';

const processor = await createSatteriMarkdownProcessor({
	hastPlugins: [markdownAlerts, markdownImageSizes],
});
const render = async (source) => (await processor.render(source)).code;
const image = '![example](https://example.com/image.png)';

test('display sizes and surrounding text survive Markdown rendering', async () => {
	for (const [attributes, style] of [
		['width=300px', 'width:300px;height:auto;'],
		['height=200', 'width:auto;height:200px;'],
		['width=50% height=10rem', 'width:50%;height:10rem;'],
		['width = 2.5em height = auto', 'width:2.5em;height:auto;'],
	]) {
		const html = await render(`before ${image}{${attributes}} after`);
		assert.ok(html.includes(`style="${style}"`), html);
		assert.ok(html.includes('before '));
		assert.ok(html.includes(' after'));
		assert.ok(!html.includes(attributes));
	}
});

test('invalid attributes, ordinary text, and code stay literal', async () => {
	for (const attributes of ['width=-1px', 'width=300px onclick=alert(1)', 'width=1px width=2px', 'width=calc(100%)', '']) {
		assert.ok((await render(`${image}{${attributes}}`)).includes(`{${attributes}}`));
	}
	assert.ok((await render('text{width=300px}')).includes('text{width=300px}'));
	assert.ok((await render(`\`${image}{width=300px}\``)).includes('{width=300px}'));
});

test('reference images, linked images, multiple images and alerts work', async () => {
	const html = await render(`> [!NOTE]\n> [${image}{width=300px}](https://example.com) ${image}{height=100px}\n\n![ref][photo]{width=50%}\n\n[photo]: https://example.com/ref.png`);
	assert.ok(html.includes('markdown-alert'));
	for (const style of ['width:300px;height:auto;', 'width:auto;height:100px;', 'width:50%;height:auto;']) {
		assert.ok(html.includes(style), html);
	}
});

test('local images carry display styles into Astro image optimization', async () => {
	const html = await render('![local](./photo.png){width=300px align=center}');
	assert.ok(html.includes('__ASTRO_IMAGE_'));
	assert.ok(html.includes('width:300px;height:auto;'));
	assert.ok(html.includes('display:block;margin-left:auto;margin-right:auto;'));
	assert.ok(!html.includes('{width=300px align=center}'));
});

test('alignment works alone and alongside dimensions in either order', async () => {
	for (const [align, margins] of [
		['left', 'margin-left:0;margin-right:auto;'],
		['center', 'margin-left:auto;margin-right:auto;'],
		['right', 'margin-left:auto;margin-right:0;'],
	]) {
		const standalone = await render(`${image}{align=${align}} after`);
		assert.ok(standalone.includes(`style="display:block;${margins}"`), standalone);
		assert.ok(standalone.includes(' after'));
		for (const attributes of [`width=300px align=${align}`, `align = ${align} height=200px`]) {
			const html = await render(`${image}{${attributes}}`);
			assert.ok(html.includes(`display:block;${margins}`), html);
			assert.ok(!html.includes(attributes));
		}
	}
});

test('unsupported and duplicate alignment attributes stay literal', async () => {
	for (const attributes of ['align=justify', 'align=center align=right', 'width=300px align=top']) {
		const html = await render(`${image}{${attributes}}`);
		assert.ok(html.includes(`{${attributes}}`));
		assert.ok(!html.includes('style='));
	}
});
