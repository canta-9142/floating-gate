# Floating-Gate.com

電子回路、組み込みシステム、ソフトウェア、Linux、Homelabについて、作ったものと学んだことを記録する個人ブログです。

## 構成

- Astro 7
- Astro Content Collections
- Tailwind CSS 4（Viteプラグイン）
- Markdown / MDX
- クライアントJavaScriptなし

記事は `src/content/posts/`、制作物は `src/content/projects/` で管理します。スキーマは `src/content.config.ts` にあります。

サイトURL、サイト名、プロフィール文、外部プロフィールは `astro.config.mjs` と `src/config.ts` から変更できます。

余白、文字サイズ、レイアウトなどは各AstroコンポーネントのTailwindユーティリティで管理します。色トークン、基本リンクスタイル、Markdown本文のスタイルは `src/styles/global.css` にあります。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm install` | 依存関係をインストール |
| `npm run dev -- --background` | 開発サーバーをバックグラウンドで起動 |
| `npm run astro -- dev status` | 開発サーバーの状態を確認 |
| `npm run astro -- dev logs` | 開発サーバーのログを確認 |
| `npm run astro -- dev stop` | 開発サーバーを停止 |
| `npm run check` | Astro / TypeScript の型チェック |
| `npm run build` | 本番用の静的サイトを生成 |

lint、format、単体テスト用のツールは、現在は設定していません。
