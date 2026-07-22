import { getCollection, type CollectionEntry } from 'astro:content';

export const postTypeLabels: Record<CollectionEntry<'posts'>['data']['type'], string> = {
	Project: '制作物',
	Log: '制作ログ',
	Note: '技術メモ',
	Essay: '考察',
};

export const projectStatusLabels: Record<
	NonNullable<CollectionEntry<'projects'>['data']['status']>,
	string
> = {
	Planning: '構想中',
	'In progress': '制作中',
	Paused: '一時停止',
	Completed: '完成',
	Archived: 'アーカイブ',
};

export function formatDate(date: Date) {
	return new Intl.DateTimeFormat('ja-JP', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
}

export function toDateTime(date: Date) {
	return date.toISOString().slice(0, 10);
}

export async function getPublishedPosts() {
	const posts = await getCollection('posts', ({ data }) => !import.meta.env.PROD || !data.draft);
	return posts.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

export async function getSortedProjects() {
	const projects = await getCollection('projects');
	return projects.sort((a, b) => {
		const aDate = a.data.updatedAt?.valueOf() ?? a.data.startedAt?.valueOf() ?? 0;
		const bDate = b.data.updatedAt?.valueOf() ?? b.data.startedAt?.valueOf() ?? 0;
		return bDate - aDate;
	});
}

export function projectTitle(project: CollectionEntry<'projects'>) {
	return project.data.title ?? project.id;
}
