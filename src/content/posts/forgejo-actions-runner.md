---
title: Forgejo Actions Runnerをセルフホストする
description: Forgejo上にRunnerを置いた
publishedAt: 2026-07-24
updatedAt: 2026-07-27
type: Note
tags:
  - linux
  - nixos
  - rock3b
  - forgejo
draft: false
featured: false
---

個人リポジトリのビルドを自宅のマシンで実行するため、Forgejo Actions Runnerを追加しました。

## 構成

Runnerは専用ユーザーで動かし、デプロイ先への書き込み権限はデプロイ用スクリプトに必要な範囲だけ与えています。ワークフローからホスト全体を操作できる状態にはしません。

```yaml
runs-on: docker
steps:
  - uses: actions/checkout@v4
  - run: npm ci
  - run: npm run build
```

## 残っていること

キャッシュの削除時期と、失敗したジョブの作業ディレクトリをどこまで残すかは、運用しながら調整します。
