---
title: ROCK 3B に NixOS を導入する手順
description: ARM SBC 上の NixOS
status: In progress
startedAt: 2026-07-24
updatedAt: 2026-07-27
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

## Radxa ROCK 3B について

Radxaから出ているSBCの一つです。

CPUにはRockchip RK3568を搭載しており、4コアのCortex-A55とMali-G52 GPUを備えています。
通常のデスクトップ用途で使うには少し物足りないですが、静的なコンテンツを配信するサーバーや、軽量なCI/CD環境を構築するには十分な性能です。

NVMe SSD用の`M.2 2280 M-Key`スロットがボード上に実装されており、また無線LANモジュール用の`M.2 2230 E-Key`スロットやLTEモジュール用の`M.2242(?) B-Key`スロットおよびSIMカードスロットも備えており、非常に拡張性が高いです。

それだけでは飽き足らずコスパも非常に魅力的で、私が購入したRadxaの公式ストアではRAM 8GBのモデルが13,000円台で販売されていました。

![ROCK 3BのAliExpressでの商品ページ](../../assets/projects/Screenshot_20260727-165634.png)

https://a.aliexpress.com/_c4nvp3ob

(現在は在庫切れになっているみたいです)

## LinuxのARMボード対応

Radxa ROCK 3Bは、Linuxカーネルのmainlineに対応しているとかなんとかで、Radxa公式から出ている Radxa OS を使わなくても一応動きます。

Radxa OS を使用しない場合、カーネルのバージョンを高く保つことができますが、ファンなどの設定(つまりRadxa OSの`rsetup`で行えること)はできません。

初回起動時にブートローダーの設定を変更する必要があり、Radxa OS で起動する必要があります。

## 必要なもの

- PC (Linux推奨)
- Radxa ROCK 3B 本体
- microSDカード (16GB程度で十分)
- microSDカードリーダー
- UART-USB変換ケーブル あるいは Raspberry Pi などのシリアル通信ができるデバイス (3V3レベル、使用しない可能性あり)
- 有線LAN環境
- NVMe SSD (M.2 2280 M-Key)
- キーボード・マウスをお好みで

## Radxa OS での初回起動

>ゴール: ROCK 3B を Radxa OS で起動し、`rsetup`から SPI ブートローダーを更新し NVMe から起動できるようにする。

1. ROCK 3B の公式サイトから Radxa OS のイメージをダウンロードします。
  [Radxa OS](https://wiki.radxa.com/Rock3/dev/rock3b_os)
2. ダウンロードしたイメージを microSD カードに書き込みます。Linuxの場合は`dd`コマンド、WindowsやMacOSの場合は`balenaEtcher`や`Rufus`のddモードを利用しましょう。（調べればいくらでも出てくると思います）

