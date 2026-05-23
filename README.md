# OpenCode Mobile Optimizer

OpenCode Web UI (localhost:4000) をモバイルデバイス向けに最適化する Tampermonkey UserScript です。

## 解決する3つの課題

| 課題 | 説明 | 解決策 |
|------|------|--------|
| セッション一覧不完全 | モバイルで全セッションが見づらい | タップターゲット拡大、自動スクロール、アクションボタン常時表示 |
| タブ多数 | ファイル/セッション管理が困難 | ボトムナビゲーション + ファイルチップ |
| 縦スペース不足 | 画面が狭く情報が収まらない | ビューポート高安定化、パディング削減、セーフエリア対応 |

## インストール方法

### 前提条件
- [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) または [Greasemonkey](https://www.greasespot.net/) (Firefox) がインストール済みであること
- OpenCode が `http://localhost:4000` で起動していること

### 手順

1. Tampermonkey のアイコンをクリックし、「新規スクリプトを作成」を選択
2. エディタが開いたら、既存のテンプレートをすべて削除
3. `opencode-mobile.user.js` の内容をすべてコピーして貼り付け
4. `Ctrl+S` (または `Cmd+S`) で保存
5. `http://localhost:4000` にアクセス

または、ファイルを Tampermonkey にドラッグ＆ドロップでもインポート可能です。

### 動作確認

1. ブラウザの DevTools を開く (`F12`)
2. デバイスツールバーを有効化 (`Ctrl+Shift+M`)
3. モバイル端末を選択（例: iPhone SE, Pixel 7）
4. 画面下部にボトムナビゲーションバーが表示されることを確認

## 対応デバイス

- スマートフォン（画面幅 1024px 未満）
- 小型タブレット（iPad Mini 等）
- デスクトップ（1024px 以上）では元の UI が維持されます

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

## 無効化方法

Tampermonkey の管理画面でスクリプトのトグルをオフにするだけです。
デスクトップ表示時は自動的に最適化が無効になります。

## ライセンス

MIT License
