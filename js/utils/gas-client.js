// ============================================================
// gas-client.js
// GAS(Google Apps Script) Web Appとの通信ラッパー
//
// 【CORSの落とし穴】
// POST時にContent-Type: application/json を指定すると、ブラウザが
// プリフライトリクエスト(OPTIONS)を送りますが、GASはOPTIONSに
// 正しく応答できずCORSエラーになります。
// そのため、あえて text/plain を指定して「シンプルリクエスト」扱いに
// することで、プリフライトを発生させずに送信します。
// ============================================================

import { CONFIG } from '../../config/config.js';

/**
 * シートから全件取得
 * @param {string} sheetName - 'Todo' | 'Tomorrow' | 'Reminders' | 'Memo' | 'Stats'
 */
export async function fetchSheet(sheetName) {
  const url = `${CONFIG.GAS_WEB_APP_URL}?token=${encodeURIComponent(CONFIG.GAS_SECRET_TOKEN)}&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

/**
 * 1行を追加/更新(先頭カラムのIDが一致すれば上書き、なければ新規)
 */
export async function upsertRow(sheetName, payload) {
  return postToGAS({ sheet: sheetName, action: 'upsert', payload });
}

/**
 * IDを指定して1行削除
 */
export async function deleteRow(sheetName, id) {
  return postToGAS({ sheet: sheetName, action: 'delete', payload: { id } });
}

/**
 * シート全体を丸ごと置き換え(メモ・実績カウンターのような
 * 「常に最新の全件」を扱うデータ向け)
 */
export async function replaceAllRows(sheetName, rows) {
  return postToGAS({ sheet: sheetName, action: 'replaceAll', payload: { rows } });
}

async function postToGAS(body) {
  const res = await fetch(CONFIG.GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // ← CORS回避の肝
    body: JSON.stringify({ token: CONFIG.GAS_SECRET_TOKEN, ...body }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}
