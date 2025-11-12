import { defineConfig } from 'vite'

// Chrome拡張機能プロジェクト用のダミー設定
// 実際のビルドは chrome-extension/ フォルダ内で行います
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
})
