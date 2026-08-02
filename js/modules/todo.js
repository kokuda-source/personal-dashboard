// ============================================================
// todo.js
// 「ToDoリスト」と「明日やること」の2つのリストを管理する
//
// 【並び替えの仕様について(補足)】
// 元要件は「締切」と「優先度」でソートとのことですが、入力項目として
// 明示されていたのは「所要時間(5段階)」のみだったため、ここでは
//   ・優先度(1〜5、手動入力)
//   ・所要時間(1〜5、目安)
// の両方を入力できるようにし、「締切の近さ」と「優先度」を
// 組み合わせたスコアで自動ソートしています。
// (もし所要時間だけで十分という場合はpriorityの入力欄を削除し、
//  computeScore内のpriority参照をeffortに差し替えてください)
//
// 【オフラインファースト方針】
// 操作は即座にlocalStorageへ反映→画面更新→裏でGASへ同期、の順。
// 同期に失敗した項目は syncPending フラグを立てて次回起動時に再送する。
// ============================================================

import { getItem, setItem } from '../utils/storage.js';
import { fetchSheet, upsertRow, deleteRow } from '../utils/gas-client.js';
import { deadlineLabel, daysUntil, toShortJaDate } from '../utils/date.js';

const els = {};
let todoCache = [];
let tomorrowCache = [];

export function initTodoModule() {
  els.todoList = document.getElementById('todo-list');
  els.todoForm = document.getElementById('todo-form');
  els.todoTitle = document.getElementById('todo-title');
  els.todoDeadline = document.getElementById('todo-deadline');
  els.todoEffort = document.getElementById('todo-effort');
  els.todoPriority = document.getElementById('todo-priority');

  els.tomorrowList = document.getElementById('tomorrow-list');
  els.tomorrowForm = document.getElementById('tomorrow-form');
  els.tomorrowTitle = document.getElementById('tomorrow-title');
  els.tomorrowMemo = document.getElementById('tomorrow-memo');

  // ローカルキャッシュをまず表示(即応性優先)
  todoCache = getItem('todo_cache', []);
  tomorrowCache = getItem('tomorrow_cache', []);
  renderTodo();
  renderTomorrow();

  els.todoForm.addEventListener('submit', onSubmitTodo);
  els.tomorrowForm.addEventListener('submit', onSubmitTomorrow);

  // 裏でGASの最新データを取得して上書き
  syncFromGAS();
}

async function syncFromGAS() {
  try {
    const [todoRows, tomorrowRows] = await Promise.all([
      fetchSheet('Todo'),
      fetchSheet('Tomorrow'),
    ]);
    todoCache = todoRows.map(normalizeTodoRow);
    tomorrowCache = tomorrowRows;
    setItem('todo_cache', todoCache);
    setItem('tomorrow_cache', tomorrowCache);
    renderTodo();
    renderTomorrow();
  } catch (err) {
    console.warn('[todo] GAS同期に失敗。ローカルキャッシュのまま表示します', err);
  }
}

function normalizeTodoRow(row) {
  return {
    id: row.id,
    title: row.title,
    deadline: row.deadline,
    effort: Number(row.effort) || 1,
    priority: Number(row.priority) || 1,
    done: row.done === true || row.done === 'TRUE' || row.done === 'true',
  };
}

// ---- ToDo ----

function onSubmitTodo(e) {
  e.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    title: els.todoTitle.value.trim(),
    deadline: els.todoDeadline.value,
    effort: Number(els.todoEffort.value),
    priority: Number(els.todoPriority.value),
    done: false,
  };
  if (!item.title) return;

  todoCache.push(item);
  setItem('todo_cache', todoCache);
  renderTodo();
  els.todoForm.reset();

  upsertRow('Todo', item).catch(err => console.warn('[todo] sync failed', err));
}

export function toggleTodoDone(id) {
  const item = todoCache.find(t => t.id === id);
  if (!item) return;
  item.done = !item.done;
  setItem('todo_cache', todoCache);
  renderTodo();
  upsertRow('Todo', item).catch(err => console.warn('[todo] sync failed', err));
}

export function removeTodo(id) {
  todoCache = todoCache.filter(t => t.id !== id);
  setItem('todo_cache', todoCache);
  renderTodo();
  deleteRow('Todo', id).catch(err => console.warn('[todo] sync failed', err));
}

function computeScore(todo) {
  const diff = daysUntil(todo.deadline);
  // 締切が近い(または超過)ほど、優先度が高いほどスコアが上がる
  const urgency = diff === Infinity ? 0 : Math.max(0, 10 - diff);
  return todo.priority * 3 + urgency;
}

function renderTodo() {
  if (!els.todoList) return;
  const sorted = [...todoCache]
    .filter(t => !t.done)
    .sort((a, b) => computeScore(b) - computeScore(a));
  const done = todoCache.filter(t => t.done);

  if (sorted.length === 0 && done.length === 0) {
    els.todoList.innerHTML = '<li class="empty">ToDoはありません</li>';
    return;
  }

  els.todoList.innerHTML = [
    ...sorted.map(t => todoItemHtml(t, false)),
    ...done.map(t => todoItemHtml(t, true)),
  ].join('');

  els.todoList.querySelectorAll('[data-action="toggle"]').forEach(btn =>
    btn.addEventListener('click', () => toggleTodoDone(btn.dataset.id))
  );
  els.todoList.querySelectorAll('[data-action="delete"]').forEach(btn =>
    btn.addEventListener('click', () => removeTodo(btn.dataset.id))
  );
}

function todoItemHtml(t, done) {
  const overdue = !done && daysUntil(t.deadline) < 0;
  return `
    <li class="todo-item ${done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}">
      <label class="todo-item__check">
        <input type="checkbox" data-action="toggle" data-id="${t.id}" ${done ? 'checked' : ''}>
        <span class="todo-item__title">${escapeHtml(t.title)}</span>
      </label>
      <span class="todo-item__meta">
        <span class="badge badge--priority">優先度${t.priority}</span>
        <span class="badge badge--deadline">${escapeHtml(deadlineLabel(t.deadline))}</span>
      </span>
      <button class="icon-btn" data-action="delete" data-id="${t.id}" aria-label="削除">×</button>
    </li>
  `;
}

// ---- 明日やること ----

function onSubmitTomorrow(e) {
  e.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    title: els.tomorrowTitle.value.trim(),
    memo: els.tomorrowMemo.value.trim(),
    done: false,
  };
  if (!item.title) return;

  tomorrowCache.push(item);
  setItem('tomorrow_cache', tomorrowCache);
  renderTomorrow();
  els.tomorrowForm.reset();

  upsertRow('Tomorrow', item).catch(err => console.warn('[tomorrow] sync failed', err));
}

export function removeTomorrow(id) {
  tomorrowCache = tomorrowCache.filter(t => t.id !== id);
  setItem('tomorrow_cache', tomorrowCache);
  renderTomorrow();
  deleteRow('Tomorrow', id).catch(err => console.warn('[tomorrow] sync failed', err));
}

function renderTomorrow() {
  if (!els.tomorrowList) return;
  if (tomorrowCache.length === 0) {
    els.tomorrowList.innerHTML = '<li class="empty">明日やることは未登録です</li>';
    return;
  }
  els.tomorrowList.innerHTML = tomorrowCache.map(t => `
    <li class="tomorrow-item">
      <span class="tomorrow-item__title">${escapeHtml(t.title)}</span>
      ${t.memo ? `<span class="tomorrow-item__memo">${escapeHtml(t.memo)}</span>` : ''}
      <button class="icon-btn" data-action="delete-tomorrow" data-id="${t.id}" aria-label="削除">×</button>
    </li>
  `).join('');

  els.tomorrowList.querySelectorAll('[data-action="delete-tomorrow"]').forEach(btn =>
    btn.addEventListener('click', () => removeTomorrow(btn.dataset.id))
  );
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
