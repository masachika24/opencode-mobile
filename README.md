# OpenCode Mobile Optimizer

OpenCode Web UI (localhost:4000) を Android スマートフォン向けに最適化する Tampermonkey UserScript です。
Tailscale 経由で自宅PCの OpenCode に外出先からアクセスすることを前提としています。

## 全体アーキテクチャ

```
┌─────────────────────┐     Tailscale (VPN/WireGuard)     ┌──────────────────────┐
│   Android スマホ     │ ◄─────────────────────────────► │  自宅PC               │
│                     │                                   │                      │
│  Kiwi/Firefox       │   http://100.x.y.z:4000          │  OpenCode v1.14.x    │
│  + Tampermonkey     │   または                          │  localhost:4000 起動中 │
│  + UserScript       │   http://<host>.ts.net:4000      │                      │
└─────────────────────┘                                   └──────────────────────┘
```

外出先からでも、Tailscale が安全なトンネルを張って自宅PCと同じネットワークにいるかのように通信できます。

## 必要なもの

| 項目 | 説明 |
|------|------|
| Android スマートフォン | Android 9.0 以降推奨 |
| 自宅PC | OpenCode v1.14.x が起動中で `localhost:4000` にアクセス可能なこと |
| Tailscale | 両方のデバイスにインストール済み。同じ Tailnet 上にあること |
| Kiwi Browser または Firefox (Android) | 拡張機能が使えるブラウザ |
| Tampermonkey 拡張機能 | ブラウザごとに対応するアドオンをインストール |

## 導入ステップ

### Step 1: Tailscale のセットアップ

- 自宅PCと Android の両方に Tailscale アプリをインストールし、同じアカウントでログインする
- Tailscale 管理画面 (https://login.tailscale.com/admin/machines) で両方のデバイスが「Connected」になっていることを確認する
- 自宅PCの Tailscale IP（`100.x.y.z`）または MagicDNS ホスト名（`<hostname>.ts.net`）をメモしておく

```
# 自宅PC で IP を確認するコマンド
tailscale ip -4
```

### Step 2: OpenCode が起動していることを確認

- 自宅PCのブラウザで `http://localhost:4000` にアクセスし、OpenCode の Web UI が表示されることを確認
- Basic 認証が必要な場合、ユーザー名・パスワードを控えておく
  - デフォルトでは ユーザー名: `opencode`
- ファイアウォールでポート 4000 を許可する必要は**ありません**（Tailscale 経由であれば不要）

### Step 3: Android に Tampermonkey をインストール

**Kiwi Browser の場合:**
1. Kiwi Browser を Play ストアからインストール
2. Kiwi Browser で Chrome ウェブストアを開く
3. [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) を追加

**Firefox (Android) の場合:**
1. Firefox を Play ストアからインストール
2. Firefox メニュー → アドオン → [Tampermonkey](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/) を追加
3. Firefox では `about:config` の変更や特別な設定は **不要** です。アドオンを追加するだけで使えます。

### Step 4: UserScript をインストール

> **注記:** Kiwi Browser / Firefox どちらでも同じ手順です。

#### 方法A（推奨・ワンタップ）
Tampermonkey は `.user.js` の URL を自動検出します。Android のブラウザで以下の URL を開くだけで、Tampermonkey がスクリプトを認識し、インストール画面が表示されます。「インストール」をタップするだけです。

```
https://raw.githubusercontent.com/masachika24/opencode-mobile/master/opencode-mobile.user.js
```

（URL を手打ちする代わりに、この README のリンクをタップしてもOKです）

> Firefox の場合、URL を開くと「スクリプトをインストールしますか？」という Tampermonkey の確認ダイアログが表示されます。「インストール」をタップしてください。

#### 方法B（URL 手入力）
Tampermonkey アイコン →「ユーティリティ」タブ →「Install from URL」に上記 URL を貼り付けて「インストール」。

#### 方法C（手動コピペ・最終手段）
1. 上記 URL をブラウザで開き、表示されたコードを全選択コピー
2. Tampermonkey →「新規スクリプトを作成」→ 貼り付け → 保存

### 更新方法（自動更新）

UserScript の `@updateURL` / `@downloadURL` により、Tampermonkey が自動で更新をチェックします。

**自動で更新する:**
1. Tampermonkey アイコン →「ユーティリティ」を開く
2. 「更新を確認」ボタンをクリック
3. 新しいバージョンがあれば自動インストールされる

**更新間隔の設定:**
1. Tampermonkey → 設定 →「スクリプトの更新」
2. 「更新をチェックする間隔」を変更可能（デフォルト: 24時間）

### Step 5: アクセス

1. Android ブラウザで以下のいずれかの URL にアクセス:
   - `http://<自宅PCのTailscale IP>:4000` (例: `http://100.123.45.67:4000`)
   - `http://<ホスト名>.ts.net:4000` (例: `http://my-pc.ts.net:4000`)
2. Basic 認証のダイアログが表示されたら、ユーザー名・パスワードを入力
   - Firefox の場合も、ブラウザ標準の Basic 認証ダイアログが表示されます。
3. 初回アクセス時に HTTP（HTTPS ではない）接続であることによる「安全ではありません」という警告が出る場合があります。Tailscale は WireGuard による暗号化トンネルを張っているため、通信は保護されており安全です。
4. **画面下部に「Sessions / Editor / Settings」のボトムナビゲーションバーが表示されれば成功です**

## 動作確認

- ✅ 画面下部に `Sessions` / `Editor` / `Settings` ボタンが常時表示されている
- ✅ 左端から右へスワイプするとセッション一覧パネルが開く
- ✅ セッション項目がタップしやすいサイズ（最小 64px 高）になっている
- ✅ ファイルタブがチップ表示される（複数ファイルを開いている場合）
- ✅ デスクトップ表示時（横幅 1024px 以上）はモバイル用 UI が非表示になる

## トラブルシューティング

### ボトムナビゲーションが表示されない

- 画面を一度**横持ち → 縦持ち**に戻してください。resize イベントが発火して UI が再構築されます。
- ブラウザのページをリロードしてください。

### スクリプトが動かない

- Tampermonkey 管理画面で当スクリプトが**有効**（緑色のトグル）になっているか確認
- Tampermonkey 拡張機能自体が有効か確認（ブラウザの拡張機能設定から）

#### Firefox で Tampermonkey が動かない場合

- Firefox のメニュー → アドオン を開き、Tampermonkey が **有効**（青いトグルが ON）になっているか確認してください。
- Firefox の「設定」→「プライバシーとセキュリティ」→「強化型トラッキング防止」で「厳格」モードにしている場合、トラッキングコンテンツのブロックが Tampermonkey の動作に影響することがあります。必要に応じて、アクセス先サイトを例外に追加するか、「標準」モードに切り替えてください。

### Tailscale アドレスでスクリプトが動作しない

MagicDNS ホスト名（`*.ts.net`）や Tailscale IP（`100.x.y.z`）でアクセスしているのにスクリプトが動作しない場合:

1. Tampermonkey 管理画面で当スクリプトの設定を開く
2. 「設定」タブ →「ユーザー設定のインクルード/除外」を確認
3. 自分のアクセス先 URL が `@match` または `@include` に含まれているか確認
4. 含まれていない場合、以下の行を追加:

```
// @include      http://<あなたの Tailscale IP>:4000/*
// @include      http://<あなたのホスト名>.ts.net:4000/*
```

### デバッグログの確認方法

デフォルトではデバッグログが有効になっています。ブラウザのコンソール（開発者ツール）を開くと `[OCM]` プレフィックス付きのログが表示されます。

デバッグログを無効にするには、スクリプト内の以下の行を編集してください:

```javascript
const DEBUG = false;  // true → false に変更
```

## 無効化方法

- Tampermonkey の管理画面でスクリプトのトグルを**オフ**にする
- デスクトップからアクセスした場合は自動的にモバイル用 UI が無効化されます（横幅 1024px 以上）

## ファイル構成

```
opencode-mobile/
├── opencode-mobile.user.js  ← UserScript 本体
├── design.md                ← 設計書
├── requirements.md          ← 要件定義書
├── test-plan.md             ← テスト計画書
├── test-results.md          ← テスト結果報告書
├── README.md                ← 本書
└── opencode.json            ← OpenCode 設定
```

## ライセンス

MIT License
