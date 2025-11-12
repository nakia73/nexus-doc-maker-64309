// 設定を読み込み
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.sync.get(['apiKey', 'corpusName', 'minWordCount']);
  
  if (settings.apiKey) {
    document.getElementById('apiKey').value = settings.apiKey;
  }
  
  if (settings.corpusName) {
    document.getElementById('corpusName').value = settings.corpusName;
  }
  
  if (settings.minWordCount) {
    document.getElementById('minWordCount').value = settings.minWordCount;
  }

  // イベントリスナー
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('testBtn').addEventListener('click', testApiConnection);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
});

// 設定を保存
async function saveSettings() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const corpusName = document.getElementById('corpusName').value.trim() || 'Web Pages Corpus';
  const minWordCount = parseInt(document.getElementById('minWordCount').value) || 100;

  if (!apiKey) {
    showStatus('API Keyを入力してください', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({
      apiKey,
      corpusName,
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
