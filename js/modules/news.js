// ============================================================
// news.js
// News API系サービスの多くは無料プランだとブラウザからの直接fetchが
// CORSでブロックされるため、RSSフィード + rss2json変換サービスを
// 経由して取得する(バックエンド不要でCORSを回避できる代替案)
// ============================================================

import { CONFIG } from '../../config/config.js';

const els = {};

export function initNewsModule() {
  els.list = document.getElementById('news-list');
  els.status = document.getElementById('news-status');
}

export async function loadNews() {
  if (!els.status) initNewsModule();
  setStatus('取得中...');
  try {
    const apiUrl = new URL('https://api.rss2json.com/v1/api.json');
    apiUrl.searchParams.set('rss_url', CONFIG.NEWS_RSS_URL);
    if (CONFIG.RSS2JSON_API_KEY) apiUrl.searchParams.set('api_key', CONFIG.RSS2JSON_API_KEY);

    const res = await fetch(apiUrl);
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || 'RSS取得エラー');

    const items = (json.items || []).slice(0, 6);
    renderList(items);
    setStatus('');
  } catch (err) {
    console.error('[news] failed', err);
    setStatus('ニュースの取得に失敗しました');
  }
}

function renderList(items) {
  if (!els.list) return;
  if (items.length === 0) {
    els.list.innerHTML = '<li class="empty">ニュースがありません</li>';
    return;
  }
  els.list.innerHTML = items.map(item => `
    <li class="news-item">
      <a href="${item.link}" target="_blank" rel="noopener">
        <span class="news-item__title">${escapeHtml(item.title)}</span>
        <span class="news-item__date">${formatDate(item.pubDate)}</span>
      </a>
    </li>
  `).join('');
}

function formatDate(pubDate) {
  if (!pubDate) return '';
  const d = new Date(pubDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
