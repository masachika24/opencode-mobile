# OpenCode Web UI モバイル最適化 UserScript 設計書

## 1. 概要

OpenCode Web UI (localhost:4000) は React SPA + Tailwind CSS で構築された AI コーディングアシスタントの Web インターフェース。
デスクトップ（1280px+）では快適だが、モバイル（~375-430px）では以下の3つの課題がある。
本 UserScript は、Tampermonkey / Greasemonkey 上で動作し、CSS 上書き + JS DOM 操作によりこれらの課題を解決する。

## 2. 現状の DOM 構造分析

### 2.1 ルートレイアウト
- `<div id="root" class="flex flex-col h-dvh p-px">` - Tailwind CSS 製
- 問題点: `h-dvh` は動的ビューポート高。モバイルブラウザの URL バー表示/非表示で高さが変動し、UI がガタつく

### 2.2 サイドバー（セッション一覧）
- デスクトップ: `hidden xl:block` / `xl:flex` で 1280px+ でのみ表示
- モバイルスライドオーバー: `fixed top-10 bottom-0 left-0 z-50 w-full max-w-[400px]` 
  - `translate-x-0`（開）/ `-translate-x-full`（閉）
  - `transition-transform duration-200 ease-out`
- セッション項目: `group/session`, `group/workspace` セレクタ
- 操作ボタン: ホバー/フォーカスで表示（`group-hover/session:opacity-100`）

### 2.3 メインコンテンツ領域
- `flex flex-col items-start contain-strict`
- 上部: プロジェクトセレクタ + セッションタイトル
- 中央: チャット/エディタ領域（セッションコンテンツ）
- 下部: 入力エリア

### 2.4 ブレークポイント
| プレフィックス | 幅       | 用途 |
|-------------|----------|------|
| sm          | 640px+   | 小テーブル |
| md          | 768px+   | タブレット |
| lg          | 1024px+  | 小デスクトップ |
| xl          | 1280px+  | サイドバー表示 |

## 3. 課題と解決方針

### 課題 1: セッション一覧不完全
**現象**: モバイルではサイドバーが非表示。スライドオーバーで開いても、セッション数が多いとスクロールが大変で、アクティブセッションが隠れる。

**解決方針**:
1. モバイルスライドオーバーの開閉をスワイプジェスチャーでも操作可能に
2. アクティブセッションを常にスクロール位置に表示（auto-scroll）
3. セッション項目のタップターゲットを大きく（`min-h-14` → `min-h-16`）
4. スライドオーバー背景のタップで閉じる機能を明示的に

### 課題 2: タブ多数（ファイル/セッションの管理）
**現象**: 多くのファイルを開くと管理が困難。セッション切り替えに手間がかかる。

**解決方針**:
1. モバイル用のボトムナビゲーションバーを追加（セッション一覧、エディタ、設定）
2. 開いているファイルを水平スクロール可能なチップ（pill）形式で表示
3. 現在のセッション名をヘッダーに短縮表示（長い場合は省略）
4. セッション間のスワイプナビゲーション（実験的機能）

### 課題 3: 縦スペース不足
**現象**: `h-dvh` とブラウザクロームで利用可能領域が狭い。

**解決方針**:
1. `h-dvh` → `100vh` または `100%` に上書き（スクロールの安定化）
2. `p-px` → `p-0` に変更
3. 不要なパディング/マージンの削減
4. 入力エリアのフォーカス時にキーボードが表示されても UI が破綻しないよう調整
5. `safe-area-inset-*` 環境変数を使用したノッチ対応

## 4. UserScript アーキテクチャ

```
opencode-mobile.user.js
├── ==UserScript== ヘッダー（@match, @grant, etc.）
├── CSS 注入（GM_addStyle）
│   ├── ビューポート調整（h-dvh → 100%）
│   ├── パディング最適化
│   ├── タップターゲット拡大
│   ├── フォントサイズ調整
│   └── ボトムナビゲーション用スタイル
├── DOM 操作（MutationObserver）
│   ├── モバイル検出（window.innerWidth < 1024）
│   ├── ボトムナビゲーション注入
│   ├── ファイルチップ注入
│   ├── スワイプジェスチャー
│   └── セッション自動スクロール
└── ユーティリティ
    ├── debounce/throttle
    ├── safe-area 検出
    └── デバッグログ（開発時のみ）
```

## 5. モバイル検出ロジック

```javascript
const isMobile = () => window.innerWidth < 1024; // lg breakpoint
const isSmallMobile = () => window.innerWidth < 640; // sm breakpoint
```

## 6. CSS 上書き一覧

| 対象 | 現在値 | 変更後 | 理由 |
|------|--------|--------|------|
| `#root` の height | `h-dvh` (100dvh) | `100%` + `min-height: 100vh` | 動的ビューポート高の変動防止 |
| `#root` の padding | `p-px` (1px) | `0` | 1px の無駄を排除 |
| セッション項目 min-height | `min-h-14` | `min-h-16` | タップターゲット拡大 |
| ヘッダー高さ | 可変 | 固定 + 小さく | 縦スペース確保 |
| 入力エリア | 可変 | 固定 + 下部配置 | キーボード対策 |
| `.group/session` アクションボタン | ホバー時のみ表示 | 常時表示（モバイル） | タップ操作に対応 |
| サイドバー幅 | `max-w-[400px]` | `max-w-[320px]` (小画面) | 画面占有率適正化 |

## 7. 実装ファイル構成

```
C:\dev\opencode-mobile\
├── design.md              ← 本書
├── opencode-mobile.user.js ← UserScript 本体
└── README.md              ← インストール手順（最終成果物）
```

## 8. 制約・注意点

1. **Basic 認証**: localhost:4000 は Basic 認証が必要だが、UserScript は認証済みページ上で動作するため影響なし
2. **React SPA**: DOM が動的に生成されるため、MutationObserver で要素の出現を待つ必要がある
3. **Tailwind ユーティリティクラス**: `!important` で上書きが必要なケースあり
4. **ダークモード対応**: `data-color-scheme` 属性を確認し、スタイルを両対応
5. **バージョン**: OpenCode v1.14.32 で動作確認

## 9. レビュー記録

| 日付 | レビュアー | 結果 | コメント |
|------|-----------|------|----------|
| 2026-05-24 | orchestrator | ✅ 承認 | 要件定義書 (requirements.md) との整合性確認済み。DOM 構造分析は JS バンドル解析に基づいており正確。CSS 上書き一覧は適切。実装に進んでよい。
