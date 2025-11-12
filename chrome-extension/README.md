# Gemini File Search Uploader - Chrome Extension

Chrome拡張機能として、現在開いているWebページの内容を自動的に抽出し、Google Gemini File Search Storeにアップロードするツールです。

## 🎯 主な機能

- **自動テキスト抽出**: 開いているWebページから主要なコンテンツを自動抽出
- **ストア選択**: 既存のFile Search Storeから任意のアップロード先を選択可能
- **メタデータ保存**: ページタイトル、URL、説明、文字数などを自動保存
- **アップロード履歴**: 最近アップロードしたページの履歴を表示
- **API Key管理**: Gemini API Keyを安全に保存・管理

## 📦 インストール方法

### 1. 拡張機能の読み込み

```bash
1. Chrome ブラウザを開く
2. chrome://extensions/ にアクセス
3. 右上の「デベロッパーモード」をONにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. chrome-extensionフォルダを選択
```

### 2. アイコンの準備（オプション）

```bash
# ImageMagickを使用してアイコンをリサイズ
cd chrome-extension/icons
convert icon-base.png -resize 128x128 icon128.png
convert icon-base.png -resize 48x48 icon48.png
convert icon-base.png -resize 16x16 icon16.png
```

## ⚙️ 初期設定

### Step 1: API Keyの取得と設定

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリックしてAPI Keyを取得
3. Chrome拡張機能アイコンをクリック
4. 右上の⚙️（設定）ボタンをクリック
5. 「Gemini API Key」フィールドにAPI Keyを貼り付け
6. 「保存」ボタンをクリック
7. 「API接続テスト」で接続を確認

### Step 2: ストアの選択

1. 設定画面で「ストア一覧を読み込む」ボタンをクリック
2. ドロップダウンリストから使用したいFile Search Storeを選択
3. 選択したストアは自動的に保存されます

**重要**: ストアが存在しない場合は、[Google AI Studio](https://aistudio.google.com/)で事前にFile Search Storeを作成してください。

### Step 3: 抽出設定（オプション）

- **最小文字数**: アップロードする最小文字数を設定（デフォルト: 100文字）
  - これより短いページはアップロードされません

## 📖 使用方法

### 基本的な使い方

1. アップロードしたいWebページを開く
2. Chrome拡張機能アイコンをクリック
3. ポップアップで以下の情報を確認：
   - 選択中のストア名
   - ページタイトル
   - URL
   - 抽出された文字数
   - コンテンツのプレビュー
4. 「Upload to Gemini File Search」ボタンをクリック
5. アップロード完了まで待つ（通常数秒）

### アップロード履歴の確認

- ポップアップの下部に最近アップロードした10件が表示されます
- 各項目には以下の情報が含まれます：
  - ページタイトル
  - URL
  - アップロード日時

## 🔧 技術仕様

### ファイル構成

```
chrome-extension/
├── manifest.json          # Manifest V3設定
├── content.js            # コンテンツ抽出スクリプト
├── background.js         # バックグラウンド処理とAPI連携
├── popup.html            # ポップアップUI
├── popup.js              # ポップアップロジック
├── options.html          # 設定画面UI
├── options.js            # 設定画面ロジック
├── styles.css            # スタイルシート
└── icons/                # アイコン画像
```

### 使用API

- **Gemini File Search API v1beta**
  - エンドポイント: `https://generativelanguage.googleapis.com/v1beta`
  - 使用メソッド:
    - `GET /corpora` - ストア一覧の取得
    - `POST /corpora` - 新規ストアの作成
    - `POST /{corpusName}/documents` - ドキュメントのアップロード

### データストレージ

- **Chrome Storage Sync**:
  - API Key
  - 選択中のストア名
  - 最小文字数設定
  
- **Chrome Storage Local**:
  - アップロード履歴（最大10件）

## ⚠️ 注意事項

### 制限事項

- **テキスト長制限**: 最大50,000文字（Gemini APIの制限）
- **アップロード頻度**: API レート制限に注意
- **ファイルサイズ**: メタデータ込みで適切なサイズに調整されます

### セキュリティ

- API KeyはChrome Storage Syncに暗号化保存されます
- すべての通信はHTTPSで行われます
- コード内にAPI Keyをハードコードしないでください

## 🐛 トラブルシューティング

### エラー: "API Key not set"

**解決方法:**
1. 設定画面を開く
2. API Keyを入力
3. 「保存」をクリック
4. 「API接続テスト」で確認

### エラー: "Failed to extract content"

**原因:**
- ページが動的に生成されている
- ページがJavaScriptで保護されている
- アクセス権限がない

**解決方法:**
1. ページを完全に読み込んだ後にもう一度試す
2. 別のページでテストする

### エラー: "ストアが見つかりませんでした"

**解決方法:**
1. [Google AI Studio](https://aistudio.google.com/)でFile Search Storeを作成
2. 設定画面で「ストア一覧を読み込む」を再実行

### エラー: "Failed to upload document"

**原因:**
- APIレート制限に達した
- ネットワーク接続の問題
- ストアが削除されている

**解決方法:**
1. 数分待ってから再試行
2. ネットワーク接続を確認
3. ストア選択を再設定

## 📝 更新履歴

### v1.0.0 (2025-01-15)
- 初回リリース
- 基本的なテキスト抽出機能
- Gemini File Search API連携
- ストア選択機能
- アップロード履歴管理
- API Key管理機能

## 🤝 サポート

問題や質問がある場合は、以下のリソースを参照してください：

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [File Search API Reference](https://ai.google.dev/api/file-search)

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
