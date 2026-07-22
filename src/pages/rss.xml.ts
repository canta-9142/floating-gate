import type { APIRoute } from 'astro';
import { SITE } from '../config';
import { getPublishedPosts } from '../utils/content';

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export const GET: APIRoute = async ({ site }) => {
	const base = site ?? new URL('https://floating-gate.com');
	const posts = await getPublishedPosts();
	const items = posts
		.map((post) => {
			const url = new URL(`/posts/${post.id}/`, base).href;
			return `<item>
        <title>${escapeXml(post.data.title)}</title>
        <link>${url}</link>
        <guid isPermaLink="true">${url}</guid>
        <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
        <description>${escapeXml(post.data.description)}</description>
      </item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${SITE.title}</title>
    <link>${base.href}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>ja</language>
    ${items}
  </channel>
</rss>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
	});
};
