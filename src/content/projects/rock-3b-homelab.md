---
title: ROCK 3B Homelab
description: ARMボード上のNixOSで動かしている、小規模な自宅サーバーの構成記録。
status: In progress
startedAt: 2025-01-06
updatedAt: 2025-05-16
technologies:
  - ROCK 3B
  - NixOS
  - Forgejo
  - Podman
featured: true
relatedPosts:
  - rock-3b-nixos
  - forgejo-actions-runner
---

## 何を作ろうとしているか

ソースコードの保管や小さなWebサイトのビルドに使える、自宅内のサーバーです。運用自体をLinuxとネットワークの練習にしています。

## 設計方針

NixOSの設定をリポジトリで管理し、壊したときに構成を追える状態を目指しています。一度にサービスを増やさず、バックアップと更新手順を確認してから追加します。

## 現在の状態

ForgejoとActions Runnerが稼働しています。外部公開するサービスは限定し、管理画面は宅内ネットワークからだけアクセスできる構成です。

## 発生した問題

ARM向けイメージの起動とストレージ構成で何度かやり直しました。復旧手順はまだ手作業が残っています。

## 次に行うこと

設定データの定期バックアップを別媒体へ保存し、実際に復元できるか確認します。
