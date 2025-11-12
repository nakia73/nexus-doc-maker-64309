let currentPageData = null;

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async () => {
  // 設定ボタン
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // アップロードボタン
  document.getElementById('uploadBtn').addEventListener('click', handleUpload);

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

    // コンテンツスクリプトにメッセージを送信
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });

    if (response.success) {
      currentPageData = response.data;
      displayPageInfo(response.data);
    } else {
      showError('ページの内容を抽出できませんでした: ' + response.error);
    }
  } catch (error) {
    console.error('Error loading page content:', error);
    showError('ページの内容を取得中にエラーが発生しました');
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
