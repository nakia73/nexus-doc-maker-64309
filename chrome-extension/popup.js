// DOM要素
const elements = {
  apiKeyInput: document.getElementById('apiKeyInput'),
  toggleApiKeyBtn: document.getElementById('toggleApiKeyBtn'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  apiKeyStatus: document.getElementById('apiKeyStatus'),
  storeSelect: document.getElementById('storeSelect'),
  refreshStoresBtn: document.getElementById('refreshStoresBtn'),
  createStoreBtn: document.getElementById('createStoreBtn'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  wordCount: document.getElementById('wordCount'),
  contentPreview: document.getElementById('contentPreview'),
  uploadBtn: document.getElementById('uploadBtn'),
  uploadStatus: document.getElementById('uploadStatus'),
  uploadProgress: document.getElementById('uploadProgress'),
  historyList: document.getElementById('historyList'),
  createStoreModal: document.getElementById('createStoreModal'),
  newStoreName: document.getElementById('newStoreName'),
  confirmCreateBtn: document.getElementById('confirmCreateBtn'),
  cancelCreateBtn: document.getElementById('cancelCreateBtn'),
  createStoreStatus: document.getElementById('createStoreStatus')
};

let currentPageData = null;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedApiKey();
  await loadStores();
  await loadPageContent();
  await loadHistory();
  setupEventListeners();
});

// イベントリスナー設定
function setupEventListeners() {
  elements.toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  elements.saveApiKeyBtn.addEventListener('click', saveApiKey);
  elements.refreshStoresBtn.addEventListener('click', loadStores);
  elements.createStoreBtn.addEventListener('click', showCreateStoreModal);
  elements.storeSelect.addEventListener('change', handleStoreSelection);
  elements.uploadBtn.addEventListener('click', handleUpload);
  elements.confirmCreateBtn.addEventListener('click', createNewStore);
  elements.cancelCreateBtn.addEventListener('click', hideCreateStoreModal);
  
  // モーダル外クリックで閉じる
  elements.createStoreModal.addEventListener('click', (e) => {
    if (e.target === elements.createStoreModal) {
      hideCreateStoreModal();
    }
  });
}

// APIキー管理
async function loadSavedApiKey() {
  const result = await chrome.storage.sync.get(['apiKey']);
  if (result.apiKey) {
    elements.apiKeyInput.value = result.apiKey;
    showStatus(elements.apiKeyStatus, 'APIキーが設定されています', 'success');
  }
}

function toggleApiKeyVisibility() {
  const type = elements.apiKeyInput.type === 'password' ? 'text' : 'password';
  elements.apiKeyInput.type = type;
  elements.toggleApiKeyBtn.textContent = type === 'password' ? '👁️' : '🙈';
}

async function saveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus(elements.apiKeyStatus, 'APIキーを入力してください', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({ apiKey });
    showStatus(elements.apiKeyStatus, 'APIキーを保存しました', 'success');
    await loadStores(); // 保存後にストア一覧を読み込み
  } catch (error) {
    showStatus(elements.apiKeyStatus, 'APIキーの保存に失敗しました', 'error');
  }
}

// ストア管理
async function loadStores() {
  const result = await chrome.storage.sync.get(['apiKey', 'selectedStore']);
  
  if (!result.apiKey) {
    elements.storeSelect.innerHTML = '<option value="">APIキーを設定してください</option>';
    elements.storeSelect.disabled = true;
    elements.refreshStoresBtn.disabled = true;
    return;
  }

  elements.storeSelect.innerHTML = '<option value="">読み込み中...</option>';
  elements.storeSelect.disabled = true;
  elements.refreshStoresBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'listStores' });
    
    if (!response.success) {
      throw new Error(response.error || 'ストアの読み込みに失敗しました');
    }

    const stores = response.stores || [];
    
    if (stores.length === 0) {
      elements.storeSelect.innerHTML = '<option value="">ストアがありません</option>';
    } else {
      elements.storeSelect.innerHTML = '<option value="">-- ストアを選択 --</option>';
      stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.name;
        option.textContent = store.displayName || store.name;
        elements.storeSelect.appendChild(option);
      });

      // 保存されたストアを選択
      if (result.selectedStore) {
        elements.storeSelect.value = result.selectedStore;
      }
    }

    elements.storeSelect.disabled = false;
    elements.refreshStoresBtn.disabled = false;
    updateUploadButtonState();
  } catch (error) {
    console.error('Store loading error:', error);
    elements.storeSelect.innerHTML = '<option value="">エラー: 読み込み失敗</option>';
    elements.storeSelect.disabled = false;
    elements.refreshStoresBtn.disabled = false;
  }
}

async function handleStoreSelection() {
  const selectedStore = elements.storeSelect.value;
  
  if (selectedStore) {
    await chrome.storage.sync.set({ selectedStore });
  }
  
  updateUploadButtonState();
}

function updateUploadButtonState() {
  const hasStore = elements.storeSelect.value !== '';
  const hasContent = currentPageData && currentPageData.content;
  elements.uploadBtn.disabled = !(hasStore && hasContent);
}

// ストア作成モーダル
function showCreateStoreModal() {
  elements.createStoreModal.style.display = 'flex';
  elements.newStoreName.value = '';
  elements.createStoreStatus.textContent = '';
  elements.newStoreName.focus();
}

function hideCreateStoreModal() {
  elements.createStoreModal.style.display = 'none';
}

async function createNewStore() {
  const storeName = elements.newStoreName.value.trim();
  
  if (!storeName) {
    showStatus(elements.createStoreStatus, 'ストア名を入力してください', 'error');
    return;
  }

  elements.confirmCreateBtn.disabled = true;
  showStatus(elements.createStoreStatus, '作成中...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'createStore',
      storeName: storeName
    });

    if (!response.success) {
      throw new Error(response.error || 'ストアの作成に失敗しました');
    }

    showStatus(elements.createStoreStatus, 'ストアを作成しました', 'success');
    
    // ストア一覧を再読み込み
    await loadStores();
    
    // 新しいストアを選択
    elements.storeSelect.value = response.store.name;
    await chrome.storage.sync.set({ selectedStore: response.store.name });
    updateUploadButtonState();
    
    setTimeout(hideCreateStoreModal, 1500);
  } catch (error) {
    console.error('Store creation error:', error);
    showStatus(elements.createStoreStatus, `エラー: ${error.message}`, 'error');
  } finally {
    elements.confirmCreateBtn.disabled = false;
  }
}

// ページコンテンツ読み込み
async function loadPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
    
    if (response && response.content) {
      currentPageData = response;
      displayPageInfo(response);
      updateUploadButtonState();
    } else {
      elements.contentPreview.textContent = 'コンテンツを取得できませんでした';
    }
  } catch (error) {
    console.error('Content extraction error:', error);
    elements.contentPreview.textContent = 'このページからコンテンツを抽出できません';
  }
}

function displayPageInfo(data) {
  elements.pageTitle.textContent = data.metadata.title || '-';
  elements.pageUrl.href = data.metadata.url;
  elements.pageUrl.textContent = data.metadata.url;
  elements.wordCount.textContent = data.metadata.wordCount.toLocaleString() + ' 文字';
  
  const preview = data.content.substring(0, 500);
  elements.contentPreview.textContent = preview + (data.content.length > 500 ? '...' : '');
}

// アップロード処理
async function handleUpload() {
  if (!currentPageData) {
    showStatus(elements.uploadStatus, 'ページデータがありません', 'error');
    return;
  }

  const result = await chrome.storage.sync.get(['selectedStore']);
  if (!result.selectedStore) {
    showStatus(elements.uploadStatus, 'ストアを選択してください', 'error');
    return;
  }

  elements.uploadBtn.disabled = true;
  elements.uploadProgress.style.display = 'block';
  showStatus(elements.uploadStatus, 'アップロード中...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'uploadToGemini',
      data: currentPageData
    });

    if (!response.success) {
      throw new Error(response.error || 'アップロードに失敗しました');
    }

    showStatus(elements.uploadStatus, 'アップロードに成功しました！', 'success');
    await loadHistory();
    
    setTimeout(() => {
      elements.uploadStatus.textContent = '';
      elements.uploadProgress.style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error('Upload error:', error);
    showStatus(elements.uploadStatus, `エラー: ${error.message}`, 'error');
    elements.uploadProgress.style.display = 'none';
  } finally {
    elements.uploadBtn.disabled = false;
    updateUploadButtonState();
  }
}

// 履歴表示
async function loadHistory() {
  const result = await chrome.storage.local.get(['uploadHistory']);
  const history = result.uploadHistory || [];

  if (history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">履歴なし</div>';
    return;
  }

  elements.historyList.innerHTML = history.slice(0, 5).map(item => `
    <div class="history-item">
      <div class="history-title">${escapeHtml(item.title)}</div>
      <div class="history-meta">
        <span>${formatDate(item.uploadedAt)}</span>
        <a href="${escapeHtml(item.url)}" target="_blank" class="history-link">🔗</a>
      </div>
    </div>
  `).join('');
}

// ユーティリティ関数
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status-message ${type}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}