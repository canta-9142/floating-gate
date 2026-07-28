#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const contentRoot = path.join(projectRoot, 'src', 'content');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const contentKinds = [
	{ label: 'Post（記事）', value: 'posts' },
	{ label: 'Project（制作物）', value: 'projects' },
];

const postTypes = ['Project', 'Log', 'Note', 'Essay'];
const projectStatuses = ['Planning', 'In progress', 'Paused', 'Completed', 'Archived'];

function localDateString(date = new Date()) {
	const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return localDate.toISOString().slice(0, 10);
}

function yamlString(value) {
	return JSON.stringify(value);
}

function yamlList(key, values) {
	if (values.length === 0) return [];
	return [`${key}:`, ...values.map((value) => `  - ${yamlString(value)}`)];
}

function parseList(value) {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function isValidDate(value) {
	if (!datePattern.test(value)) return false;

	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isValidUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function renderPost(data) {
	return [
		'---',
		`title: ${yamlString(data.title)}`,
		`description: ${yamlString(data.description)}`,
		`publishedAt: ${data.publishedAt}`,
		`updatedAt: ${data.updatedAt}`,
		`type: ${data.type}`,
		...yamlList('tags', data.tags),
		`draft: ${data.draft}`,
		`featured: ${data.featured}`,
		'---',
		'',
		'<!-- 本文をここに書く -->',
		'',
	].join('\n');
}

function renderProject(data) {
	const lines = ['---'];

	if (data.title) lines.push(`title: ${yamlString(data.title)}`);
	if (data.description) lines.push(`description: ${yamlString(data.description)}`);
	if (data.status) lines.push(`status: ${yamlString(data.status)}`);
	if (data.startedAt) lines.push(`startedAt: ${data.startedAt}`);
	if (data.updatedAt) lines.push(`updatedAt: ${data.updatedAt}`);
	lines.push(...yamlList('technologies', data.technologies));
	if (data.repository) lines.push(`repository: ${yamlString(data.repository)}`);
	if (data.demo) lines.push(`demo: ${yamlString(data.demo)}`);
	lines.push(`featured: ${data.featured}`);
	if (data.cover) {
		lines.push('cover:', `  src: ${yamlString(data.cover.src)}`, `  alt: ${yamlString(data.cover.alt)}`);
	}
	lines.push(...yamlList('relatedPosts', data.relatedPosts));
	lines.push('---', '', '<!-- 本文をここに書く -->', '');

	return lines.join('\n');
}

function createPrompts(readline) {
	async function required(message, validate) {
		while (true) {
			const value = (await readline.question(`${message}: `)).trim();
			if (!value) {
				console.log('値を入力してください。');
				continue;
			}
			if (validate && !validate(value)) {
				continue;
			}
			return value;
		}
	}

	async function optional(message, validate) {
		while (true) {
			const value = (await readline.question(`${message}: `)).trim();
			if (!value) return undefined;
			if (validate && !validate(value)) {
				continue;
			}
			return value;
		}
	}

	async function choice(message, choices, defaultIndex = 0, allowEmpty = false) {
		console.log(`\n${message}`);
		if (allowEmpty) console.log('  0. 未設定');
		choices.forEach((item, index) => {
			const label = typeof item === 'string' ? item : item.label;
			console.log(`  ${index + 1}. ${label}`);
		});

		while (true) {
			const defaultLabel = allowEmpty && defaultIndex === -1 ? '0' : String(defaultIndex + 1);
			const answer = (await readline.question(`選択 [${defaultLabel}]: `)).trim();
			if (!answer) return defaultIndex === -1 ? undefined : choices[defaultIndex];
			if (allowEmpty && answer === '0') return undefined;

			const selectedIndex = Number(answer) - 1;
			if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < choices.length) {
				return choices[selectedIndex];
			}
			console.log('表示されている番号を入力してください。');
		}
	}

	async function confirm(message, defaultValue = false) {
		const hint = defaultValue ? 'Y/n' : 'y/N';
		while (true) {
			const answer = (await readline.question(`${message} [${hint}]: `)).trim().toLowerCase();
			if (!answer) return defaultValue;
			if (answer === 'y' || answer === 'yes') return true;
			if (answer === 'n' || answer === 'no') return false;
			console.log('y または n を入力してください。');
		}
	}

	async function date(message, defaultValue) {
		while (true) {
			const hint = defaultValue ? ` [${defaultValue}]` : '（省略可）';
			const answer = (await readline.question(`${message}${hint}: `)).trim();
			const value = answer || defaultValue;
			if (!value) return undefined;
			if (isValidDate(value)) return value;
			console.log('実在する日付を YYYY-MM-DD 形式で入力してください。');
		}
	}

	async function url(message) {
		return optional(`${message}（省略可）`, (value) => {
			if (isValidUrl(value)) return true;
			console.log('http:// または https:// から始まるURLを入力してください。');
			return false;
		});
	}

	return { choice, confirm, date, optional, required, url };
}

async function collectPost(prompts) {
	const today = localDateString();
	const type = await prompts.choice('記事の種類を選んでください', postTypes, 2);

	return {
		title: await prompts.required('タイトル'),
		description: await prompts.required('概要'),
		publishedAt: await prompts.date('公開日', today),
		updatedAt: await prompts.date('更新日', today),
		type,
		tags: parseList((await prompts.optional('タグ（カンマ区切り、省略可）')) ?? ''),
		draft: await prompts.confirm('下書きにしますか？', true),
		featured: await prompts.confirm('注目記事にしますか？', false),
	};
}

async function collectProject(prompts) {
	const title = await prompts.optional('タイトル（省略可）');
	const description = await prompts.optional('概要（省略可）');
	const status = await prompts.choice('制作状況を選んでください', projectStatuses, 1, true);
	const startedAt = await prompts.date('開始日');
	const updatedAt = await prompts.date('更新日', localDateString());
	const technologies = parseList(
		(await prompts.optional('技術・キーワード（カンマ区切り、省略可）')) ?? '',
	);
	const repository = await prompts.url('リポジトリURL');
	const demo = await prompts.url('デモURL');
	const featured = await prompts.confirm('注目の制作物にしますか？', false);
	const coverSource = await prompts.optional('カバー画像のパス（省略可）');
	const cover = coverSource
		? {
				src: coverSource,
				alt: await prompts.required('カバー画像の代替テキスト'),
			}
		: undefined;
	const relatedPosts = parseList(
		(await prompts.optional('関連記事ID（カンマ区切り、省略可）')) ?? '',
	);

	return {
		title,
		description,
		status: typeof status === 'string' ? status : undefined,
		startedAt,
		updatedAt,
		technologies,
		repository,
		demo,
		featured,
		cover,
		relatedPosts,
	};
}

function printHelp() {
	console.log(`使い方: npm run content:new -- [--dry-run]

対話形式で Post または Project の Markdown ファイルを生成します。

オプション:
  --dry-run  ファイルを書き込まず、生成内容だけを表示
  --help     このヘルプを表示`);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes('--help') || args.includes('-h')) {
		printHelp();
		return;
	}

	const unknownArgs = args.filter((arg) => arg !== '--dry-run');
	if (unknownArgs.length > 0) {
		throw new Error(`不明なオプションです: ${unknownArgs.join(', ')}`);
	}

	const dryRun = args.includes('--dry-run');
	const readline = createInterface({ input: process.stdin, output: process.stdout });
	const prompts = createPrompts(readline);

	try {
		console.log('新しいコンテンツを作成します。Ctrl+C で中止できます。');
		const kind = await prompts.choice('作成する種類を選んでください', contentKinds);
		const collection = kind.value;
		const slug = await prompts.required('ファイル名 / URL ID（例: my-new-post）', (value) => {
			if (slugPattern.test(value)) return true;
			console.log('半角小文字・数字・ハイフンのみで入力してください。');
			return false;
		});
		const outputPath = path.join(contentRoot, collection, `${slug}.md`);
		try {
			await access(outputPath);
			throw new Error(`同名のコンテンツが既にあります: ${path.relative(projectRoot, outputPath)}`);
		} catch (error) {
			if (error?.code !== 'ENOENT') throw error;
		}
		const data = collection === 'posts' ? await collectPost(prompts) : await collectProject(prompts);
		const content = collection === 'posts' ? renderPost(data) : renderProject(data);

		console.log(`\n生成先: ${path.relative(projectRoot, outputPath)}\n`);
		console.log(content);

		if (dryRun) {
			console.log('dry-run のため、ファイルは作成していません。');
			return;
		}

		if (!(await prompts.confirm('この内容で作成しますか？', true))) {
			console.log('作成を中止しました。');
			return;
		}

		await mkdir(path.dirname(outputPath), { recursive: true });
		await writeFile(outputPath, content, { encoding: 'utf8', flag: 'wx' });
		console.log(`\n作成しました: ${path.relative(projectRoot, outputPath)}`);
	} finally {
		readline.close();
	}
}

main().catch((error) => {
	if (error?.code === 'EEXIST') {
		console.error('同名のコンテンツが既にあります。別のファイル名を指定してください。');
	} else if (
		error?.code === 'ERR_USE_AFTER_CLOSE' ||
		error?.name === 'AbortError' ||
		error?.message === 'Aborted with Ctrl+C'
	) {
		console.error('\n作成を中止しました。');
		process.exitCode = 130;
		return;
	} else {
		console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
	}
	process.exitCode = 1;
});
