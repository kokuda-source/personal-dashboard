// ============================================================
// calendar.js
// Googleカレンダー(primary)から「今日」「明日」の予定を取得して表示
// ============================================================

import { todayStr, tomorrowStr } from '../utils/date.js';

const els = {};

export function initCalendarModule() {
  els.today = document.getElementById('calendar-today-list');
  els.tomorrow = document.getElementById('calendar-tomorrow-list');
  els.status = document.getElementById('calendar-status');
}

export async function loadCalendar(accessToken) {
  if (!els.status) initCalendarModule();
  setStatus('読み込み中...');
  try {
    const timeMin = new Date(`${todayStr()}T00:00:00+09:00`).toISOString();
    const timeMax = new Date(`${tomorrowStr()}T23:59:59+09:00`).toISOString();

    const events = await fetchEvents(accessToken, timeMin, timeMax);
    const todayEvents = events.filter(e => isOnDate(e, todayStr()));
    const tomorrowEvents = events.filter(e => isOnDate(e, tomorrowStr()));

    renderList(els.today, todayEvents, '本日の予定はありません');
    renderList(els.tomorrow, tomorrowEvents, '明日の予定はありません');
    setStatus('');
  } catch (err) {
    console.error('[calendar] failed', err);
    setStatus('取得に失敗しました(再サインインが必要かもしれません)');
  }
}

async function fetchEvents(token, timeMin, timeMax) {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  const json = await res.json();
  return json.items || [];
}

function isOnDate(event, dateStr) {
  const start = event.start?.dateTime || event.start?.date;
  return start && start.startsWith(dateStr);
}

function renderList(container, events, emptyText) {
  if (!container) return;
  if (events.length === 0) {
    container.innerHTML = `<li class="empty">${emptyText}</li>`;
    return;
  }
  container.innerHTML = events.map(e => {
    const time = e.start?.dateTime
      ? new Date(e.start.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : '終日';
    return `
      <li class="calendar-item">
        <span class="calendar-item__time">${time}</span>
        <span class="calendar-item__title">${escapeHtml(e.summary || '(無題の予定)')}</span>
      </li>
    `;
  }).join('');
}

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
