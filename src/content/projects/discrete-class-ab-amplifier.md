---
title: Discrete Class-AB Amplifier
description: ディスクリート構成の小信号用AB級アンプ。まずは安定したバイアスと測定方法を検討しています。
status: In progress
startedAt: 2025-02-10
updatedAt: 2025-07-08
technologies:
  - Analog circuit
  - KiCad
  - SPICE
featured: true
cover:
  src: /images/projects/class-ab-amplifier.svg
  alt: AB級アンプの試作回路を表した簡略図
relatedPosts:
  - class-ab-bias
---

## 何を作ろうとしているか

手元の測定環境で挙動を追える、小さなディスクリートAB級アンプを作っています。出力の大きさより、各段の役割を実測しながら理解することを優先しています。

## 制約と設計方針

- 入手しやすい部品を使う
- 低い電源電圧から試す
- 調整箇所と測定点を基板上で分かりやすくする

## 現在の状態

出力段とバイアス回路を検討中です。回路図はまだ確定しておらず、温度変化を含めた静止電流の測定後に部品値を見直します。

## 発生した問題

シミュレーション上の値をそのまま試作へ持ち込むと、トランジスタのばらつきと熱結合の違いが大きく出ました。

## 次に行うこと

試作基板で温度と静止電流の時間変化を記録します。その後、入力段を含めた全体構成へ進みます。
