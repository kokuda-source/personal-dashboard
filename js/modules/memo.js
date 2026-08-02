// ============================================================
// memo.js
// シンプルなテキストエリア。入力停止後1秒でlocalStorageとGASの
// 両方に自動保存する(デバウンス処理)
// ============================================================

import { getItem, setItem } from '../utils/storage.js';
import { fetchSheet, replaceAllRows } from '../utils/gas-client.js';

const els = {};
let debounceTimer = null;

export function initMemoModule() {
  els.textarea = document.getElementById('memo-textarea');
  els.status = document.getElementById('memo-status');

  els.textarea.value = getItem('memo_cache', '');
  els.textarea.addEventListener('input', onInput);

  syncFromGAS();
}

async function syncFromGAS() {
  try {
    const rows = await fetchSheet('Memo');
    if (rows.length > 0) {
      const content = rows[0].content || '';
      els.textarea.value = content;
      setItem('memo_cache', content);
    }
  } catch (err) {
    console.warn('[memo] GAS同期に失敗。ローカルキャッシュのまま表示します', err);
  }
}

function onInput() {
  setStatus('入力中...');
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(save, 1000);
}

async function save() {
  const content = els.textarea.value;
  setItem('memo_cache', content);
  setStatus('保存済み');

  try {
    // メモは1件だけなのでシートを丸ごと置き換える
    await replaceAllRows('Memo', [{ id: 'memo', content }]);
  } catch (err) {
    console.warn('[memo] sync failed', err);
    setStatus('保存済み(端末内のみ・同期待ち)');
  }
}

function setStatus(text) {
  if (els.status) els.status.textContent = text;
}
