// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://docs.astro.build/en/reference/configuration-reference/#site
export default defineConfig({
	site: 'https://floating-gate.com',
	trailingSlash: 'always',
	vite: {
		plugins: [tailwindcss()],
	},
});
