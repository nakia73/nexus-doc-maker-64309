// 設定を読み込み
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.sync.get(['apiKey', 'minWordCount', 'selectedStore']);
  
  if (settings.apiKey) {
    document.getElementById('apiKey').value = settings.apiKey;
  }
  
  if (settings.minWordCount) {
    document.getElementById('minWordCount').value = settings.minWordCount;
  }

  // 選択済みストアの表示
  if (settings.selectedStore) {
    await loadAndSelectStore(settings.selectedStore);
  }

  // イベントリスナー
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testApiConnection);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
  document.getElementById('loadStoresBtn').addEventListener('click', loadStores);
  document.getElementById('storeSelect').addEventListener('change', handleStoreSelection);
});

// 設定を保存
async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const minWordCount = parseInt(document.getElementById('minWordCount').value) || 100;

  if (!apiKey) {
    showStatus('API Keyを入力してください', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({
      apiKey,
      minWordCount
    });

    showStatus('✓ 設定を保存しました', 'success');
    
    setTimeout(() => {
      document.getElementById('status').textContent = '';
    }, 2000);
  } catch (error) {
    showStatus('保存中にエラーが発生しました', 'error');
  }
}

// API接続テスト
async function testApiConnection() {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('API Keyを入力してください', 'error');
    return;
  }

  showStatus('接続テスト中...', 'loading');
  document.getElementById('testBtn').disabled = true;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/corpora?key=${apiKey}`
    );

    if (response.ok) {
      showStatus('✓ API接続成功！', 'success');
    } else if (response.status === 401 || response.status === 403) {
      showStatus('❌ API Keyが無効です', 'error');
    } else {
      showStatus(`❌ 接続エラー (${response.status})`, 'error');
    }
  } catch (error) {
    showStatus('❌ ネットワークエラー', 'error');
  } finally {
    document.getElementById('testBtn').disabled = false;
  }
}

// 履歴をクリア
async function clearHistory() {
  if (!confirm('アップロード履歴を削除しますか？')) {
    return;
  }

  try {
    await chrome.storage.local.set({ uploadHistory: [] });
    showDataStatus('✓ 履歴をクリアしました', 'success');
  } catch (error) {
    showDataStatus('エラーが発生しました', 'error');
  }
}

// 履歴をエクスポート
async function exportHistory() {
  try {
    const { uploadHistory } = await chrome.storage.local.get(['uploadHistory']);
    
    if (!uploadHistory || uploadHistory.length === 0) {
      showDataStatus('エクスポートする履歴がありません', 'error');
      return;
    }

    const dataStr = JSON.stringify(uploadHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-upload-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showDataStatus('✓ 履歴をエクスポートしました', 'success');
  } catch (error) {
    showDataStatus('エクスポート中にエラーが発生しました', 'error');
  }
}

// ステータスメッセージを表示
function showStatus(message, type = '') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
}

function showDataStatus(message, type = '') {
  const status = document.getElementById('dataStatus');
  status.textContent = message;
  status.className = 'status ' + type;
  
  setTimeout(() => {
    status.textContent = '';
  }, 3000);
}

// ストア一覧を読み込む
async function loadStores() {
  const errorDiv = document.getElementById('storeLoadError');
  const storeSelection = document.getElementById('storeSelection');
  const storeSelect = document.getElementById('storeSelect');
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
      throw new Error('ストアが見つかりませんでした');
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
      updateSelectedStoreDisplay(settings.selectedStore, stores);
    }
    
    showStatus('✓ ストア一覧を読み込みました', 'success');
    
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
      
      const response = await chrome.runtime.sendMessage({ action: 'listStores' });
      if (response.success) {
        updateSelectedStoreDisplay(selectedStore, response.stores);
        showStatus('✓ ストアを選択しました', 'success');
      }
    } catch (error) {
      showStatus('保存中にエラーが発生しました', 'error');
    }
  }
}

// 選択中のストア表示を更新
function updateSelectedStoreDisplay(storeName, stores) {
  const store = stores.find(s => s.name === storeName);
  const displayName = store ? (store.displayName || store.name.split('/').pop()) : storeName.split('/').pop();
  document.getElementById('selectedStoreName').textContent = displayName;
}

// 初期読み込み時に選択済みストアを表示
async function loadAndSelectStore(selectedStore) {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'listStores' });
    if (response.success && response.stores.length > 0) {
      const storeSelect = document.getElementById('storeSelect');
      const storeSelection = document.getElementById('storeSelection');
      
      // ドロップダウンに追加
      response.stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.name;
        option.textContent = store.displayName || store.name.split('/').pop();
        storeSelect.appendChild(option);
      });
      
      storeSelect.value = selectedStore;
      storeSelection.style.display = 'block';
      updateSelectedStoreDisplay(selectedStore, response.stores);
    }
  } catch (error) {
    console.error('Failed to load selected store:', error);
  }
}
