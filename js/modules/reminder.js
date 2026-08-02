// ============================================================
// reminder.js
// 「毎月25日は月末締め作業」のような定期業務を登録し、
// 該当する日にダッシュボード上部へ自動表示する
// ============================================================

import { getItem, setItem } from '../utils/storage.js';
import { fetchSheet, upsertRow, deleteRow } from '../utils/gas-client.js';
import { isReminderDueToday } from '../utils/date.js';

const els = {};
let reminderCache = [];

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function initReminderModule() {
  els.banner = document.getElementById('reminder-banner');
  els.list = document.getElementById('reminder-list');
  els.form = document.getElementById('reminder-form');
  els.title = document.getElementById('reminder-title');
  els.type = document.getElementById('reminder-type');
  els.value = document.getElementById('reminder-value');

  reminderCache = getItem('reminder_cache', []);
  renderAll();

  els.form.addEventListener('submit', onSubmit);
  els.type.addEventListener('change', updateValueOptions);
  updateValueOptions();

  syncReminderFromGAS();
}

export async function syncReminderFromGAS() {
  try {
    const rows = await fetchSheet('Reminders');
    reminderCache = rows;
    setItem('reminder_cache', reminderCache);
    renderAll();
  } catch (err) {
    console.warn('[reminder] GAS同期に失敗。ローカルキャッシュのまま表示します', err);
  }
}

function onSubmit(e) {
  e.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    title: els.title.value.trim(),
    type: els.type.value,
    value: els.value.value,
  };
  if (!item.title) return;

  reminderCache.push(item);
  setItem('reminder_cache', reminderCache);
  renderAll();
  els.form.reset();
  updateValueOptions();

  upsertRow('Reminders', item).catch(err => console.warn('[reminder] sync failed', err));
}

export function removeReminder(id) {
  reminderCache = reminderCache.filter(r => r.id !== id);
  setItem('reminder_cache', reminderCache);
  renderAll();
  deleteRow('Reminders', id).catch(err => console.warn('[reminder] sync failed', err));
}

function renderAll() {
  renderBanner();
  renderList();
}

function renderBanner() {
  if (!els.banner) return;
  const dueToday = reminderCache.filter(isReminderDueToday);
  if (dueToday.length === 0) {
    els.banner.classList.add('is-hidden');
    els.banner.innerHTML = '';
    return;
  }
  els.banner.classList.remove('is-hidden');
  els.banner.innerHTML = `
    <strong>本日の定期業務:</strong>
    ${dueToday.map(r => `<span class="reminder-chip">${escapeHtml(r.title)}</span>`).join('')}
  `;
}

function renderList() {
  if (!els.list) return;
  if (reminderCache.length === 0) {
    els.list.innerHTML = '<li class="empty">登録済みの定期業務はありません</li>';
    return;
  }
  els.list.innerHTML = reminderCache.map(r => `
    <li class="reminder-item">
      <span>${escapeHtml(r.title)}</span>
      <span class="reminder-item__schedule">${describeSchedule(r)}</span>
      <button class="icon-btn" data-action="delete-reminder" data-id="${r.id}" aria-label="削除">×</button>
    </li>
  `).join('');

  els.list.querySelectorAll('[data-action="delete-reminder"]').forEach(btn =>
    btn.addEventListener('click', () => removeReminder(btn.dataset.id))
  );
}

function describeSchedule(r) {
  if (r.type === 'weekly') return `毎週${WEEKDAY_LABELS[Number(r.value)]}曜日`;
  if (r.type === 'monthly') return `毎月${r.value}日`;
  return '';
}

function updateValueOptions() {
  if (!els.value) return;
  const type = els.type.value;
  els.value.innerHTML = '';
  if (type === 'weekly') {
    WEEKDAY_LABELS.forEach((label, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${label}曜日`;
      els.value.appendChild(opt);
    });
  } else {
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = `${d}日${d === 31 ? '(月末)' : ''}`;
      els.value.appendChild(opt);
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
