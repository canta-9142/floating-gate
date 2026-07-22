import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
	schema: z.object({
		title: z.string().min(1),
		description: z.string().min(1),
		publishedAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
		type: z.enum(['Project', 'Log', 'Note', 'Essay']),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		featured: z.boolean().default(false),
	}),
});

const projects = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
	schema: z.object({
		title: z.string().min(1).optional(),
		description: z.string().min(1).optional(),
		status: z.enum(['Planning', 'In progress', 'Paused', 'Completed', 'Archived']).optional(),
		startedAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		technologies: z.array(z.string()).optional(),
		repository: z.url().optional(),
		demo: z.url().optional(),
		featured: z.boolean().default(false),
		cover: z
			.object({
				src: z.string().min(1),
				alt: z.string().min(1),
			})
			.optional(),
		relatedPosts: z.array(reference('posts')).optional(),
	}),
});

export const collections = { posts, projects };
