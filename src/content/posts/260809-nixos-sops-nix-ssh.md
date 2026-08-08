---
title: "sops-nix と Home Manager で SSH を安全かつ宣言的に管理する"
description: "サルでもわかるように解説"
publishedAt: 2026-08-09
updatedAt: 2026-08-09
type: Note
tags:
  - "sops"
  - "nixos"
  - "age"
draft: false
featured: true
---

# sops-nix

## sops-nixとは

sops-nixは、NixOSでSOPSを使用して暗号化された設定ファイルを管理するためのツールです。

SOPS自体は、GPGやAgeなどの暗号化ツールを使用してYAMLやJSONなどの設定ファイルを暗号化・復号化する、というツールです。

## sops-nixの導入と設定

ここでは例として、SSHの秘密鍵を暗号化する場合について説明しますが、他のあらゆる文字列で応用可能です。

### 1. SOPS用のAge鍵を作成する

sopsとageをインストールします。

sops-nixはNixOSのパッケージとして提供されておらず、flakeを使用する必要があるため、flakeを有効化していない場合は先にflakeを有効化してください。

```bash
nix shell nixpkgs#sops nixpkgs#age
```

age鍵の置き場所は自由ですが、ここでは`~/.config/sops/age/keys.txt`に置きます。

```bash
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
chmod 600 ~/.config/sops/age/keys.txt
```

`age-keygen`を実行すると、秘密鍵と公開鍵が`-o`オプションで指定したファイル(ここでは`~/.config/sops/age/keys.txt`)に生成されます。

その後に`Public key: age1...`のような形で公開鍵が表示されているので、これをコピーしておきます。

表示されていなければ、`age-keygen -y ~/.config/sops/age/keys.txt`で公開鍵を表示できます。

### 2. .sops.yamlを作成する

リポジトリ直下(`/etc/nixos/`など)に`.sops.yaml`を作成し、Ageの公開鍵を設定します。

```bash
cd /etc/nixos
micro .sops.yaml
```
```yaml .sops.yaml
creation_rules:
  - path_regex: ^secrets/.*\.yaml$
    age: "age1...(先ほどコピーした文字列)"
```

### 3. SSH秘密鍵を暗号化する

>[!WARNING]
> ここではターミナル上で秘密鍵を扱います。`cat`や`echo`などで表示するとシェルの履歴に残ってしまうため、これらを使用することは避けてください。
> 代わりに、`wl-copy`(Wayland環境)や`xclip`(X11環境)などを使用しなるべく履歴に残らないような形で扱うようにしてください。

SSH秘密鍵は`~/.ssh/id_ed25519`にあるとして、これをコピーします。

```bash
wl-copy < ~/.ssh/id_ed25519
```

暗号化するファイルを作成します。

```bash
mkdir -p secrets
sops secrets/ssh.yaml
```

するとnanoなどのエディタが開くので、以下のような形に編集してください。

```yaml
ssh_private_key: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  (コピーした秘密鍵)
  -----END OPENSSH PRIVATE KEY-----
```

nanoの場合、保存(Ctrl+O)→終了(Ctrl+X)の順に実行してエディタを抜けます。

実はこれは`secrets/ssh.yaml`をそのまま編集しているわけではありません。

このとき編集しているのはただの一時ファイルで、これに対して保存・終了を行うと、`secrets/ssh.yaml`には先ほど入力した内容が暗号化された状態で保存される、という仕組みになっています。

<br>

この入力内容を他の文字列に置き換えることで、SSH秘密鍵以外の文字列も暗号化することができるというわけです。

例えば、

```yaml
ssh_github_private_key: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  -----END OPENSSH PRIVATE KEY-----
github_token: "ghp_XXXXXXXXXXXXXXXXXXXXXXXX"
```

のような形ですね。

この場合ファイル名も`secrets/github.yaml`などに変更してやればわかりやすいでしょう。

### 4. sops-nixを使用してNixOSの設定に組み込む

さて、ここまでで暗号化には成功しましたが、このままではNixOSの設定に組み込むことができないので、次にsops-nixを使用した復号化と、NixOSの設定への組み込みを行います。

既存の`flake.nix`に、以下を追加します。

```nix flake.nix
{
  inputs = {
    nixpkgs.url = "(既存設定)";
    sops-nix.url = "github:Mic92/sops-nix";
  };

  outputs = { self, nixpkgs, sops-nix, ... }:
    let
      hostname = "(既存設定)";
    in
    {
      nixosConfigurations.${hostname} = nixpkgs.lib.nixosSystem {
        # 既存設定
        modules = [
          sops-nix.nixosModules.sops
        ];
      };
    };
}
```

また、`configuration.nix`(または別のNixOSモジュール)に、以下を追加します。(ここでは`configuration.nix`がリポジトリ直下に存在する前提で進めます。)

```nix configuration.nix
{
  sops = {
    defaultSopsFile = ./secrets/ssh.yaml;

    age = {
      keyFile = "/home/ユーザー名/.config/sops/age/keys.txt";
      generateKey = false;
    };

    secrets = {
      ssh_private_key = {
        owner = "ユーザー名";
        mode = "0400";
      };
    };
  };

  environment.variables.SOPS_AGE_KEY_FILE = "/home/ユーザー名/.config/sops/age/keys.txt";
}
```

これにより、`secrets/ssh.yaml`に`ssh_private_key`として宣言・暗号化したSSH秘密鍵がNixOSの設定に組み込まれ、`/run/secrets/ssh_private_key`に復号化されます。

keys.txtがないと復号化できないので、それ以外はgitに追跡させても大丈夫、とうからくりになっています。

```bash
git add .sops.yaml secrets/ssh.yaml flake.nix configuration.nix
# 好みに応じてコミットしてください。
```

そうしたらNixOSの設定を反映させることができます。

```bash
sudo nixos-rebuild switch --flake .#(ホスト名)
```

なお、`keys.txt`は公開してはならないが紛失すると復号化が不可能になるので、何らかの**オフラインバックアップ**(**念を押しておくがクラウドサービスなどはもってのほかである**)を取っておくことを推奨します。

ただしGitHubようなどであれば、SSH鍵を紛失してもサービス側で新しい鍵を登録すればよいだけなので、そこまで神経質になる必要もないと思います。

# SSH Config を Home Manager で管理する

ここは特筆することはなく、`~/.ssh/config`の設定に Home Manager が利用できるよ、というだけです。

`programs.ssh`を有効化して設定を行います。

`programs.ssh.extraConfig`にすべて文字列で書くことも可能ですし、Nix言語を活用し宣言的に(?)記述することも可能です。

マニュアルは[こちら](https://nix-community.github.io/home-manager/options/home-manager/programs/ssh.html)、オプションの検索は[こちら](https://search.nixos.org/options?channel=unstable&query=programs.ssh&type=options)から行えます。

また、従来一般的であった`programs.ssh.matchBlocks`の記法は26.05以降非推奨(deprecated)となっています。今後は`programs.ssh.settings`を使用することが推奨されています。

また`programs.ssh.enableDefaultConfig`も非推奨となる予定のようです。今後は`programs.ssh.settings`に`"*" = {}`を設定することで代替可能です。

私の設定例は[こちら](https://github.com/canta-9142/nixos-config/blob/main/modules/home/programs/ssh.nix)から参照できます。
