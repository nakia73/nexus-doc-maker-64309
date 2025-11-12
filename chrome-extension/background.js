// Gemini File Search APIクライアント
class GeminiFileSearchClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  // ストア一覧を取得
  async listFileSearchStores() {
    try {
      const response = await fetch(`${this.baseUrl}/corpora?key=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to list stores: ${response.status}`);
      }
      const data = await response.json();
      return data.corpora || [];
    } catch (error) {
      console.error('listFileSearchStores error:', error);
      throw error;
    }
  }

  async getOrCreateCorpus(name) {
    try {
      // Chrome Storageから選択されたストアを取得
      const settings = await chrome.storage.sync.get(['selectedStore']);
      
      if (settings.selectedStore) {
        // ストアが選択されている場合はそれを使用
        console.log('Using selected store:', settings.selectedStore);
        return settings.selectedStore;
      }

      // 既存のコーパス一覧を取得
      const listResponse = await fetch(`${this.baseUrl}/corpora?key=${this.apiKey}`);
      if (!listResponse.ok) {
        throw new Error(`Failed to list corpora: ${listResponse.status}`);
      }

      const listData = await listResponse.json();
      const existingCorpus = listData.corpora?.find(c => c.displayName === name);

      if (existingCorpus) {
        return existingCorpus.name;
      }

      // 新規作成
      const createResponse = await fetch(`${this.baseUrl}/corpora?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: name,
          description: 'Web pages uploaded via Chrome Extension'
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create corpus: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      return createData.name;
    } catch (error) {
      console.error('getOrCreateCorpus error:', error);
      throw error;
    }
  }

  async uploadDocument(corpusName, content, metadata) {
    try {
      // ドキュメントを作成
      const document = {
        displayName: metadata.title || 'Untitled Page',
        customMetadata: [
          { key: 'url', stringValue: metadata.url },
          { key: 'extractedAt', stringValue: metadata.extractedAt },
          { key: 'wordCount', numericValue: metadata.wordCount }
        ]
      };

      if (metadata.description) {
        document.customMetadata.push({
          key: 'description',
          stringValue: metadata.description.substring(0, 500)
        });
      }

      if (metadata.publishedDate) {
        document.customMetadata.push({
          key: 'publishedDate',
          stringValue: metadata.publishedDate
        });
      }

      // テキストコンテンツを追加
      const textContent = `Title: ${metadata.title}\nURL: ${metadata.url}\n\n${content}`;
      
      const response = await fetch(
        `${this.baseUrl}/${corpusName}/documents?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...document,
            parts: [
              {
                text: textContent.substring(0, 50000) // 最大50KB
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload document: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('uploadDocument error:', error);
      throw error;
    }
  }
}

// メッセージハンドラー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadToGemini') {
    handleUpload(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを許可
  } else if (request.action === 'listStores') {
    handleListStores()
      .then(result => sendResponse({ success: true, stores: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleUpload(data) {
  // 設定を取得
  const settings = await chrome.storage.sync.get(['apiKey', 'corpusName']);
  
  if (!settings.apiKey) {
    throw new Error('API Key not set. Please configure in Settings.');
  }

  if (!data.content || data.content.length < 100) {
    throw new Error('Content too short or empty. Minimum 100 characters required.');
  }

  const corpusName = settings.corpusName || 'Web Pages Corpus';
  const client = new GeminiFileSearchClient(settings.apiKey);

  // コーパスを取得または作成
  const corpus = await client.getOrCreateCorpus(corpusName);
  
  // ドキュメントをアップロード
  const result = await client.uploadDocument(corpus, data.content, data.metadata);

  // 履歴に追加
  const history = await chrome.storage.local.get(['uploadHistory']);
  const newHistory = history.uploadHistory || [];
  newHistory.unshift({
    title: data.metadata.title,
    url: data.metadata.url,
    uploadedAt: new Date().toISOString(),
    documentId: result.name
  });

  // 最新10件のみ保持
  if (newHistory.length > 10) {
    newHistory.splice(10);
  }

  await chrome.storage.local.set({ uploadHistory: newHistory });

  return result;
}

async function handleListStores() {
  const settings = await chrome.storage.sync.get(['apiKey']);
  
  if (!settings.apiKey) {
    throw new Error('API Key not set. Please configure in Settings.');
  }

  const client = new GeminiFileSearchClient(settings.apiKey);
  return await client.listFileSearchStores();
}
