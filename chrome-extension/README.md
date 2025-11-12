# Gemini File Search Uploader - Chrome拡張機能

現在開いているWebページを Google の Gemini File Search Store に簡単にアップロードできるChrome拡張機能です。

## 機能

- 📄 **ページコンテンツ抽出**: 現在開いているWebページから主要なテキストとメタデータを自動抽出
- ☁️ **Gemini連携**: Gemini File Search APIに直接アップロード
- 📚 **コーパス管理**: 自動でコーパスを作成・管理
- 📊 **履歴管理**: 最近アップロードしたページの履歴を表示（最大10件）
- ⚙️ **カスタマイズ可能**: APIキーやコーパス名を設定画面で管理

## インストール方法

### 1. ファイルの準備

```bash
# プロジェクトのルートディレクトリで
cd chrome-extension
```

### 2. アイコンファイルの作成

生成済みのベースアイコン（`icons/icon-base.png`）を各サイズにリサイズしてください：

**方法1: ImageMagickを使用（推奨）**

```bash
cd chrome-extension
# ImageMagickで自動リサイズ
convert icons/icon-base.png -resize 128x128 icons/icon128.png
convert icons/icon-base.png -resize 48x48 icons/icon48.png
convert icons/icon-base.png -resize 16x16 icons/icon16.png
```

**方法2: オンラインツールを使用**

1. `icons/icon-base.png` を [TinyPNG](https://tinypng.com/) や [iLoveIMG](https://www.iloveimg.com/ja/resize-image) でリサイズ
2. 128x128、48x48、16x16の3つのサイズで保存
3. それぞれ `icon128.png`, `icon48.png`, `icon16.png` として保存

**方法3: プレースホルダーを使用（テスト用）**

```bash
cd chrome-extension/icons
# 単色のプレースホルダー
convert -size 128x128 xc:#1a73e8 icon128.png
convert -size 48x48 xc:#1a73e8 icon48.png
convert -size 16x16 xc:#1a73e8 icon16.png
```

### 3. Chromeに拡張機能を読み込む

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `chrome-extension` フォルダを選択

## 初期設定

### 1. Gemini API Keyの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリック
3. API Keyをコピー

### 2. 拡張機能の設定

1. 拡張機能アイコンをクリック
2. 右上の「⚙️」（設定）ボタンをクリック
3. 以下を入力：
   - **Gemini API Key**: 取得したAPIキーを貼り付け
   - **コーパス名**: 任意の名前（デフォルト: "Web Pages Corpus"）
   - **最小文字数**: アップロードする最小文字数（デフォルト: 100）
4. 「保存」をクリック
5. （オプション）「API接続テスト」で接続を確認

## 使い方

### 基本的な使い方

1. アップロードしたいWebページを開く
2. 拡張機能アイコンをクリック
3. ページ情報が表示されるので確認
4. 「Upload to Gemini File Search」ボタンをクリック
5. アップロード完了まで待つ（通常数秒）

### アップロード履歴の確認

- ポップアップ下部に最近アップロードしたページが表示されます
- タイトル、URL、アップロード日時が確認できます

### 履歴のエクスポート

1. 設定画面を開く
2. 「データ管理」セクションで「履歴をエクスポート」をクリック
3. JSON形式でダウンロードされます

## トラブルシューティング

### 「API Key not set」エラー

- 設定画面でAPI Keyが正しく入力されているか確認してください
- API接続テストを実行して、APIキーが有効か確認してください

### 「Content too short or empty」エラー

- ページの内容が最小文字数（デフォルト100文字）に達していない可能性があります
- 動的に生成されるコンテンツの場合、ページが完全に読み込まれるまで待ってから実行してください

### 「Failed to extract content」エラー

- 一部の動的Webページ（SPA等）では抽出に失敗する場合があります
- ページを再読み込みしてから再度お試しください

### アップロードが遅い

- Gemini APIのレート制限に達している可能性があります
- 少し時間をおいてから再度お試しください

## 技術仕様

- **Manifest Version**: 3
- **対応ブラウザ**: Chrome, Edge, その他Chromium系ブラウザ
- **使用API**: Gemini File Search API v1beta
- **ストレージ**:
  - `chrome.storage.sync`: API Key、設定
  - `chrome.storage.local`: アップロード履歴

## 制限事項

- 最大アップロード文字数: 約50,000文字（Gemini APIの制限）
- 履歴保存数: 最大10件
- 一部の動的コンテンツ（JavaScript生成）は抽出できない場合があります
- ログインが必要なページは抽出できません

## プライバシー

- API Keyは Chrome の安全なストレージに保存され、外部に送信されることはありません
- アップロードされたコンテンツは Google Gemini のサーバーに送信されます
- 拡張機能は最小限の権限のみを要求します

## ライセンス

MIT License

## サポート

問題が発生した場合は、以下を確認してください：
1. Chrome DevTools のコンソールでエラーメッセージを確認
2. 拡張機能のバージョンが最新か確認
3. API Keyが有効か確認

---

**開発者向けメモ**: デバッグは `chrome://extensions/` で拡張機能の「詳細」→「バックグラウンドページ」や「コンテンツスクリプト」から可能です。
