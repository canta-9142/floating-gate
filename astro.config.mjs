// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';
import { markdownAlerts } from './src/plugins/markdown-alerts.mjs';

// https://docs.astro.build/en/reference/configuration-reference/#site
export default defineConfig({
	site: 'https://floating-gate.com',
	trailingSlash: 'always',
	markdown: {
		processor: satteri({ hastPlugins: [markdownAlerts] }),
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
