# Floating-Gate.com

個人ブログのソースコードです。

## 構成

- Astro 7
- Astro Content Collections
- Tailwind CSS 4（Viteプラグイン）
- Markdown / MDX
- クライアントJavaScriptなし (ブログ本体に限る、その他アプリはクライアントJSが必要な場合あり)

## 開発環境

Nix Flakes と nix-direnv を使用します。Nix で Flakes を有効化し、direnv と
nix-direnv のシェル連携を設定したうえで、初回のみ次を実行してください。

```sh
direnv allow
npm ci
```

以降は、このディレクトリに入ると Node.js 22 を含む開発環境が自動で有効に
なります。direnv を使わずに `nix develop` で入ることもできます。

開発サーバーはバックグラウンドで起動します。

```sh
npm run astro -- dev --background
```

## Markdown alerts

Post と Project の本文で GitHub 風の alert 記法を使えます。

```md
> [!WARNING]
> この操作は元に戻せません。
```

`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` に対応しています。
