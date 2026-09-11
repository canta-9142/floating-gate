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

## Markdown画像のサイズ指定

画像記法の直後に `{width=300px}` のように記述すると、表示サイズを指定できます。

```md
![説明](./image.png){width=300px}
![説明](./image.png){height=200px}
![説明](./image.png){width=50% height=200px}
![説明](./image.png){width=300px align=center}
![説明](./image.png){align=right}
```

`width` と `height` は `px`、`%`、`em`、`rem`、`auto` に対応し、単位なしの数値は
`px` として扱います。片方だけ指定すると縦横比を維持します。
`align=left`・`align=center`・`align=right` で画像を左寄せ・中央寄せ・右寄せにできます。
画像は独立した行に配置され、文章は回り込みません。`align` 単独でも指定できます。
未対応の属性や不正な値を含む指定は、そのまま本文に表示されます。
