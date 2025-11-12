let currentPageData = null;

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async () => {
  // 設定ボタン
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // アップロードボタン
  document.getElementById('uploadBtn').addEventListener('click', handleUpload);

  // ストア読み込みボタン
  document.getElementById('loadStoresBtn').addEventListener('click', loadStores);
  
  // ストア選択
  document.getElementById('storeSelectPopup').addEventListener('change', handleStoreSelection);

  // ストア情報を読み込む
  await loadStoreInfo();

  // 現在のページ情報を取得
  await loadPageContent();

  // 履歴を表示
  await loadHistory();
});

// ページコンテンツを取得
async function loadPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      showError('タブ情報を取得できません');
      return;
    }

    // URLチェック（chrome://やedge://などの特殊ページはアクセス不可）
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      showError('この種類のページからはコンテンツを抽出できません');
      return;
    }

    try {
      // コンテンツスクリプトにメッセージを送信
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });

      if (response && response.success) {
        currentPageData = response.data;
        displayPageInfo(response.data);
      } else {
        showError('ページの内容を抽出できませんでした: ' + (response?.error || '不明なエラー'));
      }
    } catch (messageError) {
      // content scriptが注入されていない、または応答がない場合
      console.error('Content script error:', messageError);
      showError('ページの読み込みが完了していません。数秒待ってから拡張機能アイコンをクリックし直してください。');
    }
  } catch (error) {
    console.error('Error loading page content:', error);
    showError('ページの内容を取得中にエラーが発生しました: ' + error.message);
  }
}

// ページ情報を表示
function displayPageInfo(data) {
  document.querySelector('.loading').style.display = 'none';
  document.getElementById('preview').style.display = 'block';
  document.getElementById('uploadBtn').style.display = 'block';

  document.getElementById('pageTitle').textContent = data.metadata.title;
  document.getElementById('pageUrl').textContent = data.metadata.url;
  document.getElementById('pageUrl').title = data.metadata.url;
  document.getElementById('wordCount').textContent = data.metadata.wordCount.toLocaleString();

  // プレビューテキスト（最初の200文字）
  const previewText = data.content.substring(0, 200) + (data.content.length > 200 ? '...' : '');
  document.getElementById('contentPreview').textContent = previewText;
}

// アップロード処理
async function handleUpload() {
  if (!currentPageData) {
    showError('ページデータがありません');
    return;
  }

  // API Keyが設定されているか確認
  const settings = await chrome.storage.sync.get(['apiKey']);
  if (!settings.apiKey) {
    showStatus('API Keyが設定されていません。設定画面で設定してください。', 'error');
    return;
  }

  const uploadBtn = document.getElementById('uploadBtn');
  const status = document.getElementById('status');
  const progress = document.getElementById('progress');

  uploadBtn.disabled = true;
  progress.style.display = 'block';
  showStatus('アップロード中...', 'loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'uploadToGemini',
      data: currentPageData
    });

    if (response.success) {
      showStatus('✓ アップロード完了！', 'success');
      await loadHistory(); // 履歴を更新
      
      // 2秒後にステータスをクリア
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 2000);
    } else {
      showStatus('エラー: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showStatus('アップロード中にエラーが発生しました', 'error');
  } finally {
    uploadBtn.disabled = false;
    progress.style.display = 'none';
  }
}

// ステータスメッセージを表示
function showStatus(message, type = '') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
}

// エラーメッセージを表示
function showError(message) {
  document.querySelector('.loading').style.display = 'none';
  document.getElementById('pageInfo').innerHTML = `
    <div class="error-message">
      <p>❌ ${message}</p>
    </div>
  `;
}

// 履歴を読み込んで表示
async function loadHistory() {
  const { uploadHistory } = await chrome.storage.local.get(['uploadHistory']);
  const historyList = document.getElementById('historyList');

  if (!uploadHistory || uploadHistory.length === 0) {
    historyList.innerHTML = '<p class="empty-message">アップロード履歴がありません</p>';
    return;
  }

  historyList.innerHTML = uploadHistory.map(item => `
    <div class="history-item">
      <div class="history-title">${escapeHtml(item.title)}</div>
      <div class="history-url">${escapeHtml(item.url)}</div>
      <div class="history-date">${formatDate(item.uploadedAt)}</div>
    </div>
  `).join('');
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 日付をフォーマット
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  
  return date.toLocaleDateString('ja-JP');
}

// ストア情報を読み込んで表示
async function loadStoreInfo() {
  const settings = await chrome.storage.sync.get(['selectedStore']);
  const currentStoreSpan = document.getElementById('currentStore');
  const storeWarning = document.getElementById('storeWarning');
  const uploadBtn = document.getElementById('uploadBtn');
  
  if (settings.selectedStore) {
    // ストアが選択されている
    const storeName = settings.selectedStore.split('/').pop();
    currentStoreSpan.textContent = storeName;
    storeWarning.style.display = 'none';
  } else {
    // ストアが未選択
    currentStoreSpan.textContent = '未設定';
    storeWarning.style.display = 'block';
    
    // アップロードボタンを無効化
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.title = 'ストアを設定してください';
    }
  }
}

// ストア一覧を読み込む
async function loadStores() {
  const errorDiv = document.getElementById('storeLoadError');
  const storeSelection = document.getElementById('storeSelection');
  const storeSelect = document.getElementById('storeSelectPopup');
  const loadBtn = document.getElementById('loadStoresBtn');
  
  errorDiv.style.display = 'none';
  loadBtn.disabled = true;
  loadBtn.textContent = '読み込み中...';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'listStores' });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    const stores = response.stores;
    
    if (!stores || stores.length === 0) {
      throw new Error('ストアが見つかりませんでした。Google AI Studioで作成してください。');
    }
    
    // ドロップダウンをクリア
    storeSelect.innerHTML = '<option value="">-- ストアを選択 --</option>';
    
    // ストアをドロップダウンに追加
    stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.name;
      option.textContent = store.displayName || store.name.split('/').pop();
      storeSelect.appendChild(option);
    });
    
    storeSelection.style.display = 'block';
    
    // 保存済みのストアがあれば選択
    const settings = await chrome.storage.sync.get(['selectedStore']);
    if (settings.selectedStore) {
      storeSelect.value = settings.selectedStore;
    }
    
  } catch (error) {
    errorDiv.textContent = `エラー: ${error.message}`;
    errorDiv.style.display = 'block';
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = 'ストア一覧を読み込む';
  }
}

// ストア選択時の処理
async function handleStoreSelection(e) {
  const selectedStore = e.target.value;
  
  if (selectedStore) {
    try {
      await chrome.storage.sync.set({ selectedStore });
      await loadStoreInfo(); // 表示を更新
      showStatus('✓ ストアを選択しました', 'success');
      
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 2000);
    } catch (error) {
      showStatus('保存中にエラーが発生しました', 'error');
    }
  }
}
