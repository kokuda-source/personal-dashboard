// ============================================================
// main.js
// ダッシュボード全体の初期化を行うエントリーポイント
// ============================================================

import { getItem, setItem } from './utils/storage.js';
import { initGoogleAuth, requestSignIn, isSignedIn } from './auth/google-auth.js';
import { initGmailModule, loadGmail } from './modules/gmail.js';
import { initCalendarModule, loadCalendar } from './modules/calendar.js';
import { initTodoModule } from './modules/todo.js';
import { initReminderModule } from './modules/reminder.js';
import { initNewsModule, loadNews } from './modules/news.js';
import { initMemoModule } from './modules/memo.js';
import { initPomodoroModule } from './modules/pomodoro.js';
import { initStatsModule } from './modules/stats.js';
import { renderQuickLinks } from './modules/quicklinks.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // GAS/localStorageで完結する機能は即座に初期化
  initTodoModule();
  initReminderModule();
  initMemoModule();
  initPomodoroModule();
  initStatsModule();
  renderQuickLinks();

  // ニュースはOAuth不要なので即取得
  initNewsModule();
  loadNews();

  // Gmail/Calendarのカードだけは事前にDOM参照を仕込んでおく
  initGmailModule();
  initCalendarModule();

  // Google認証(初期化 → 成功時にGmail/Calendarを取得)
  initGoogleAuth((accessToken) => {
    loadGmail(accessToken);
    loadCalendar(accessToken);
    updateSignInButton(true);
  });

  const signInBtn = document.getElementById('google-signin-btn');
  signInBtn.addEventListener('click', () => {
    requestSignIn(); // ユーザー操作起点で呼ぶ(ポップアップブロック対策)
  });
  updateSignInButton(isSignedIn());
});

function updateSignInButton(signedIn) {
  const btn = document.getElementById('google-signin-btn');
  if (!btn) return;
  btn.textContent = signedIn ? 'メール/予定を再取得' : 'Googleでサインイン';
}

// ---- テーマ切替 ----

function initTheme() {
  const saved = getItem('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(saved);

  const toggleBtn = document.getElementById('theme-toggle');
  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setItem('theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) toggleBtn.textContent = theme === 'dark' ? '☀️ ライトモード' : '🌙 ダークモード';
}
