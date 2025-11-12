# クイックスタートガイド

Chrome拡張機能を5分で動かすための最速手順です。

## 最速セットアップ（3ステップ）

### ステップ1: アイコンの準備（30秒）

```bash
cd chrome-extension

# ImageMagickを使用（推奨）
convert icons/icon-base.png -resize 128x128 icons/icon128.png
convert icons/icon-base.png -resize 48x48 icons/icon48.png
convert icons/icon-base.png -resize 16x16 icons/icon16.png

# または、テスト用プレースホルダー
mkdir -p icons
convert -size 128x128 xc:#1a73e8 icons/icon128.png
convert -size 48x48 xc:#1a73e8 icons/icon48.png
convert -size 16x16 xc:#1a73e8 icons/icon16.png
```

ImageMagickがない場合：[オンラインリサイザー](https://www.iloveimg.com/ja/resize-image)で `icon-base.png` をリサイズ

### ステップ2: Chromeで読み込み（1分）

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を**ON**
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. この`chrome-extension`フォルダを選択

→ 拡張機能が表示されます！

### ステップ3: API Keyを設定（2分）

1. [Google AI Studio](https://makersuite.google.com/app/apikey) でAPI Keyを取得
2. 拡張機能アイコンをクリック → 右上の⚙️をクリック
3. API Keyを貼り付けて「保存」
4. 「API接続テスト」をクリックして確認

## 使ってみる

1. 適当なWebページ（例：Wikipediaの記事）を開く
2. 拡張機能アイコンをクリック
3. 「Upload to Gemini File Search」をクリック
4. 完了！

## トラブルシューティング

### アイコンが表示されない
- `icons/` フォルダに `icon16.png`, `icon48.png`, `icon128.png` があるか確認
- ファイル名のスペルミスがないか確認

### 「API Key not set」エラー
- 設定画面でAPI Keyを入力してください

### 「Failed to extract content」エラー
- ページを再読み込みしてから再度試してください
- 動的なSPAページでは動作しない場合があります

## 次のステップ

詳細は [README.md](README.md) を参照してください。
