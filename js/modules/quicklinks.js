// ============================================================
// quicklinks.js
// config.js に定義したリンク集を描画するだけのシンプルなモジュール
// ============================================================

import { CONFIG } from '../../config/config.js';

export function renderQuickLinks() {
  const portalEl = document.getElementById('quicklink-portal');
  if (portalEl) {
    portalEl.href = CONFIG.MAIN_PORTAL_URL;
  }

  const listEl = document.getElementById('quicklink-list');
  if (listEl) {
    listEl.innerHTML = CONFIG.QUICK_LINKS.map(link => `
      <a class="quicklink-chip" href="${escapeAttr(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
    `).join('');
  }

  const driveEl = document.getElementById('drive-link-list');
  if (driveEl) {
    if (CONFIG.DRIVE_LINKS.length === 0) {
      driveEl.innerHTML = '<li class="empty">config.js の DRIVE_LINKS に追加してください</li>';
    } else {
      driveEl.innerHTML = CONFIG.DRIVE_LINKS.map(link => `
        <li><a href="${escapeAttr(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a></li>
      `).join('');
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
