# Floating-Gate.com

個人ブログのソースコードです。

## 構成

- Astro 7
- Astro Content Collections
- Tailwind CSS 4（Viteプラグイン）
- Markdown / MDX
- クライアントJavaScriptなし (ブログ本体に限る、その他アプリはクライアントJSが必要な場合あり)

## Markdown alerts

Post と Project の本文で GitHub 風の alert 記法を使えます。

```md
> [!WARNING]
> この操作は元に戻せません。
```

`NOTE`、`TIP`、`IMPORTANT`、`WARNING`、`CAUTION` に対応しています。
