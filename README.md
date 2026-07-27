# Floating-Gate.com

電子回路、組み込みシステム、ソフトウェア、Linux、Homelabについて、作ったものと学んだことを記録する個人ブログです。

## 構成

- Astro 7
- Astro Content Collections
- Tailwind CSS 4（Viteプラグイン）
- Markdown / MDX
- クライアントJavaScriptなし (ブログ本体に限る、その他アプリはクライアントJSが必要な場合あり)

記事は `src/content/posts/`、制作物は `src/content/projects/` で管理します。スキーマは `src/content.config.ts` にあります。

サイトURL、サイト名、プロフィール文、外部プロフィールは `astro.config.mjs` と `src/config.ts` から変更できます。

余白、文字サイズ、レイアウトなどは各AstroコンポーネントのTailwindユーティリティで管理します。色トークン、基本リンクスタイル、Markdown本文のスタイルは `src/styles/global.css` にあります。

