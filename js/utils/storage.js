// ============================================================
// storage.js
// localStorageの読み書きを共通化する薄いラッパー
//
// 使い方の方針:
//   ・GASと同期するデータ(Todo/メモ等)は「オフラインキャッシュ」として
//     ここに保存し、起動時にGASの最新データで上書きする
//   ・テーマやポモドーロ状態など端末固有のデータはここに保存したまま
//     GASには同期しない
// ============================================================

const PREFIX = 'okd_dashboard_';

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[storage] failed to read "${key}"`, e);
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[storage] failed to write "${key}"`, e);
  }
}

export function removeItem(key) {
  localStorage.removeItem(PREFIX + key);
}
