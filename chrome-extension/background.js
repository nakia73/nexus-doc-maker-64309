// 親メニューのID
const PARENT_MENU_ID = "gemini-upload-parent";

// Gemini File Search APIクライアント
class GeminiFileSearchClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.uploadBaseUrl = 'https://generativelanguage.googleapis.com/upload/v1beta';
  }

  // ストア一覧を取得
  async listFileSearchStores() {
    try {
      const response = await fetch(`${this.baseUrl}/fileSearchStores?key=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to list stores: ${response.status}`);
      }
      const data = await response.json();
      return data.fileSearchStores || [];
    } catch (error) {
      console.error('listFileSearchStores error:', error);
      throw error;
    }
  }

  // 新規ストアを作成
  async createFileSearchStore(displayName) {
    try {
      const response = await fetch(`${this.baseUrl}/fileSearchStores?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create store: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('createFileSearchStore error:', error);
      throw error;
    }
  }

  // テキストコンテンツをMarkdownファイルとしてアップロード
  async uploadTextAsFile(storeName, content, metadata) {
    try {
      // Step 1: テキストからMarkdownファイルを作成
      const markdownContent = `# ${metadata.title}

**URL:** ${metadata.url}  
**抽出日時:** ${metadata.extractedAt}  
**文字数:** ${metadata.wordCount}

---

${content}`;

      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const fileName = `${metadata.title.replace(/[^\w\s]/gi, '_').substring(0, 50)}.md`;
      
      // Step 2: Files APIで初期リクエスト (resumable upload)
      const numBytes = blob.size;
      const initialUrl = `${this.uploadBaseUrl}/files?key=${this.apiKey}`;
      
      console.log('Starting file upload:', { fileName, size: numBytes });
      
      const initialResponse = await fetch(initialUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
          'X-Goog-Upload-Header-Content-Type': 'text/markdown',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: {
            display_name: fileName
          }
        })
      });

      if (!initialResponse.ok) {
        const errorText = await initialResponse.text();
        throw new Error(`Upload init failed: ${initialResponse.status} - ${errorText}`);
      }

      const uploadUrl = initialResponse.headers.get('x-goog-upload-url');
      if (!uploadUrl) {
        throw new Error('Upload URL not found in response headers');
      }

      console.log('Got upload URL, uploading file bytes...');

      // Step 3: ファイルバイトをアップロード
      const fileBuffer = await blob.arrayBuffer();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': numBytes.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: fileBuffer
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadedFile = await uploadResponse.json();
      const uploadedFileName = uploadedFile.file.name;

      console.log('File uploaded successfully:', uploadedFileName);

      // Step 4: ストアにインポート
      const importUrl = `${this.baseUrl}/${storeName}:importFile?key=${this.apiKey}`;
      
      console.log('Importing file to store:', storeName);
      
      const importResponse = await fetch(importUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadedFileName })
      });

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        throw new Error(`Import failed: ${importResponse.status} - ${errorText}`);
      }

      const operation = await importResponse.json();
      console.log('Import operation started:', operation.name);

      // Step 5: オペレーションの完了を待つ
      return await this.pollOperation(operation.name);
    } catch (error) {
      console.error('uploadTextAsFile error:', error);
      throw error;
    }
  }

  // オペレーションの完了をポーリング
  async pollOperation(operationName) {
    const maxAttempts = 30; // 5分 (10秒 x 30回)
    const pollInterval = 10000; // 10秒

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${this.baseUrl}/${operationName}?key=${this.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`Operation polling failed: ${response.status}`);
      }

      const operation = await response.json();
      
      if (operation.done) {
        console.log('Operation completed:', operation);
        return operation;
      }

      console.log(`Polling attempt ${i + 1}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Operation timeout: exceeded maximum polling attempts');
  }
}

// コンテキストメニューの初期化
chrome.runtime.onInstalled.addListener(() => {
  // 親メニューを作成
  chrome.contextMenus.create({
    id: PARENT_MENU_ID,
    title: "Gemini File Searchにアップロード",
    contexts: ["selection"]
  });
  
  // 初期メニューを更新
  updateContextMenus();
});

// コンテキストメニューを更新する関数
async function updateContextMenus() {
  try {
    // 既存のサブメニューをすべて削除
    await chrome.contextMenus.removeAll();
    
    // 親メニューを再作成
    chrome.contextMenus.create({
      id: PARENT_MENU_ID,
      title: "Gemini File Searchにアップロード",
      contexts: ["selection"]
    });
    
    // APIキーを取得
    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    
    if (!apiKey) {
      // APIキーが未設定の場合
      chrome.contextMenus.create({
        id: "setup-required",
        parentId: PARENT_MENU_ID,
        title: "⚠️ APIキーを設定してください",
        contexts: ["selection"],
        enabled: false
      });
      return;
    }
    
    // ストア一覧を取得
    const client = new GeminiFileSearchClient(apiKey);
    const stores = await client.listFileSearchStores();
    
    if (stores.length === 0) {
      // ストアが存在しない場合
      chrome.contextMenus.create({
        id: "no-stores",
        parentId: PARENT_MENU_ID,
        title: "📁 ストアが見つかりません",
        contexts: ["selection"],
        enabled: false
      });
      return;
    }
    
    // 各ストアをサブメニューとして追加
    stores.forEach((store) => {
      const displayName = store.displayName || store.name.split('/').pop();
      chrome.contextMenus.create({
        id: `store-${store.name}`,
        parentId: PARENT_MENU_ID,
        title: `📁 ${displayName}`,
        contexts: ["selection"]
      });
    });
    
  } catch (error) {
    console.error('Failed to update context menus:', error);
    // エラー時のメニュー
    chrome.contextMenus.create({
      id: "error",
      parentId: PARENT_MENU_ID,
      title: "❌ メニューの読み込みに失敗",
      contexts: ["selection"],
      enabled: false
    });
  }
}

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuItemId = info.menuItemId;
  
  // 親メニューまたは無効なメニューの場合は何もしない
  if (menuItemId === PARENT_MENU_ID || 
      menuItemId === 'setup-required' || 
      menuItemId === 'no-stores' || 
      menuItemId === 'error') {
    if (menuItemId === 'setup-required') {
      // 設定が必要な場合はポップアップを開く
      chrome.action.openPopup();
    }
    return;
  }
  
  // ストアのIDを抽出 (id形式: "store-fileSearchStores/...")
  const storeName = menuItemId.replace('store-', '');
  const selectedText = info.selectionText;
  
  try {
    // APIキーを取得
    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    
    if (!apiKey) {
      throw new Error('APIキーが設定されていません');
    }
    
    // ページのメタデータを取得
    const pageTitle = tab.title || 'Untitled';
    const pageUrl = tab.url || '';
    
    const metadata = {
      title: `選択テキスト - ${pageTitle}`,
      url: pageUrl,
      extractedAt: new Date().toISOString(),
      wordCount: selectedText.length
    };
    
    // アップロード実行
    const client = new GeminiFileSearchClient(apiKey);
    await client.uploadTextAsFile(storeName, selectedText, metadata);
    
    // 成功通知を表示
    const storeDisplayName = storeName.split('/').pop();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-base.png',
      title: '✅ アップロード完了',
      message: `選択テキストを「${storeDisplayName}」にアップロードしました`
    });
    
    // 履歴に保存
    const history = await chrome.storage.local.get('uploadHistory') || { uploadHistory: [] };
    const newHistory = [
      {
        title: metadata.title,
        url: pageUrl,
        timestamp: Date.now(),
        storeName: storeDisplayName,
        wordCount: selectedText.length
      },
      ...(history.uploadHistory || [])
    ].slice(0, 10);
    
    await chrome.storage.local.set({ uploadHistory: newHistory });
    
  } catch (error) {
    console.error('Context menu upload error:', error);
    // エラー通知を表示
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-base.png',
      title: '❌ アップロード失敗',
      message: `エラー: ${error.message}`
    });
  }
});

// メッセージハンドラー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenus') {
    updateContextMenus()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'uploadToGemini') {
    handleUpload(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'listStores') {
    handleListStores()
      .then(result => sendResponse({ success: true, stores: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'createStore') {
    handleCreateStore(request.storeName)
      .then(result => {
        // ストア作成後にメニューを更新
        updateContextMenus();
        sendResponse({ success: true, store: result });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleUpload(data) {
  const settings = await chrome.storage.sync.get(['apiKey', 'selectedStore']);
  
  if (!settings.apiKey) {
    throw new Error('APIキーが設定されていません');
  }

  if (!settings.selectedStore) {
    throw new Error('ストアが選択されていません');
  }

  if (!data.content || data.content.length < 100) {
    throw new Error('コンテンツが短すぎるか空です（最低100文字必要）');
  }

  const client = new GeminiFileSearchClient(settings.apiKey);
  const result = await client.uploadTextAsFile(settings.selectedStore, data.content, data.metadata);

  // 履歴に追加
  const history = await chrome.storage.local.get(['uploadHistory']);
  const newHistory = history.uploadHistory || [];
  newHistory.unshift({
    title: data.metadata.title,
    url: data.metadata.url,
    uploadedAt: new Date().toISOString(),
    storeName: settings.selectedStore
  });

  if (newHistory.length > 10) {
    newHistory.splice(10);
  }

  await chrome.storage.local.set({ uploadHistory: newHistory });
  return result;
}

async function handleListStores() {
  const settings = await chrome.storage.sync.get(['apiKey']);
  
  if (!settings.apiKey) {
    throw new Error('APIキーが設定されていません');
  }

  const client = new GeminiFileSearchClient(settings.apiKey);
  return await client.listFileSearchStores();
}

async function handleCreateStore(storeName) {
  const settings = await chrome.storage.sync.get(['apiKey']);
  
  if (!settings.apiKey) {
    throw new Error('APIキーが設定されていません');
  }

  if (!storeName || storeName.trim() === '') {
    throw new Error('ストア名を入力してください');
  }

  const client = new GeminiFileSearchClient(settings.apiKey);
  return await client.createFileSearchStore(storeName);
}
