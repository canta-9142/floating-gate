import type { APIRoute } from 'astro';
import { getPublishedPosts, getSortedProjects } from '../utils/content';

export const GET: APIRoute = async ({ site }) => {
	const base = site ?? new URL('https://floating-gate.com');
	const posts = await getPublishedPosts();
	const projects = await getSortedProjects();
	const pages: { path: string; lastmod?: string }[] = [
		{ path: '/' },
		{ path: '/posts/' },
		{ path: '/projects/' },
		{ path: '/about/' },
		...posts.map((post) => ({
			path: `/posts/${post.id}/`,
			lastmod: post.data.updatedAt.toISOString(),
		})),
		...projects.map((project) => ({
			path: `/projects/${project.id}/`,
			lastmod: project.data.updatedAt?.toISOString(),
		})),
	];

	const urls = pages
		.map(
			(page) => `<url>
      <loc>${new URL(page.path, base).href}</loc>${page.lastmod ? `\n      <lastmod>${page.lastmod}</lastmod>` : ''}
    </url>`,
		)
		.join('\n');
	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
