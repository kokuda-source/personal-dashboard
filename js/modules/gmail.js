// ============================================================
// gmail.js
// Gmail APIから未読件数と「要返信」らしきメールを取得して表示する
//
// 【要返信メールの抽出方針(第一段階: キーワード方式)】
// 外部AI APIを使うとキーが露出する/コストがかかるため、まずは
// キーワードマッチによるヒューリスティックで判定する。
// 将来的にClaude API等へ差し替える場合は extractNeedsReply() を
// 拡張すればよい。
// ============================================================

const NEEDS_REPLY_KEYWORDS = [
  'ご確認', 'ご返信', 'お返事', '返信お待ち', '至急', '至急対応',
  'ご回答', 'お手数ですが', 'よろしくお願いいたします', '締切', '期限',
  'ご対応', 'いかがでしょうか',
];

const els = {};

export function initGmailModule() {
  els.container = document.getElementById('gmail-list');
  els.unreadCount = document.getElementById('gmail-unread-count');
  els.status = document.getElementById('gmail-status');
}

export async function loadGmail(accessToken) {
  if (!els.status) initGmailModule();
  setStatus('読み込み中...');
  try {
    const unread = await fetchUnreadCount(accessToken);
    els.unreadCount.textContent = unread;

    const messages = await fetchRecentMessages(accessToken, 15);
    const needsReply = messages.filter(m => scoreNeedsReply(m) > 0)
      .sort((a, b) => scoreNeedsReply(b) - scoreNeedsReply(a))
      .slice(0, 8);

    renderList(needsReply);
    setStatus('');
  } catch (err) {
    console.error('[gmail] failed', err);
    setStatus('取得に失敗しました(再サインインが必要かもしれません)');
  }
}

async function fetchUnreadCount(token) {
  const res = await gmailFetch('https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX', token);
  return res.messagesUnread ?? 0;
}

async function fetchRecentMessages(token, maxResults) {
  const listRes = await gmailFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${maxResults}`,
    token
  );
  const ids = (listRes.messages || []).map(m => m.id);

  // 直列だと遅いので少しずつ並列取得(Gmail APIのレート制限に配慮し5件ずつ)
  const results = [];
  const chunkSize = 5;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(id =>
        gmailFetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          token
        )
      )
    );
    results.push(...chunkResults);
  }

  return results.map(m => {
    const headers = m.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '(件名なし)';
    const from = headers.find(h => h.name === 'From')?.value || '';
    return { id: m.id, subject, from, snippet: m.snippet || '' };
  });
}

function scoreNeedsReply(message) {
  const text = `${message.subject} ${message.snippet}`;
  let score = 0;
  for (const kw of NEEDS_REPLY_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  return score;
}

function renderList(messages) {
  if (!els.container) return;
  if (messages.length === 0) {
    els.container.innerHTML = '<li class="empty">要返信と思われるメールはありません</li>';
    return;
  }
  els.container.innerHTML = messages.map(m => `
    <li class="gmail-item">
      <a href="https://mail.google.com/mail/u/0/#inbox/${m.id}" target="_blank" rel="noopener">
        <span class="gmail-item__from">${escapeHtml(shortenFrom(m.from))}</span>
        <span class="gmail-item__subject">${escapeHtml(m.subject)}</span>
        <span class="gmail-item__snippet">${escapeHtml(m.snippet)}</span>
      </a>
    </li>
  `).join('');
}

function shortenFrom(from) {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from;
}

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

async function gmailFetch(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  return res.json();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
