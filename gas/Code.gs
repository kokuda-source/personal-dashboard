/**
 * ============================================================
 * 個人用ポータルダッシュボード - GAS バックエンド
 * ============================================================
 * 使い方:
 *  1. script.google.com で新規プロジェクトを作成し、このファイルの
 *     内容を貼り付ける
 *  2. SHEET_ID と SECRET_TOKEN を自分の値に書き換える
 *  3. 「デプロイ」>「新しいデプロイ」>種類「ウェブアプリ」
 *     - 次のユーザーとして実行: 自分
 *     - アクセスできるユーザー: 全員
 *  4. 発行されたURLを config.js の GAS_WEB_APP_URL に設定する
 * ============================================================
 */

// ↓自分のスプレッドシートのID(URLの /d/ と /edit の間の文字列)
const SHEET_ID = '1e_FRCsA7IVAKCITl74e1iO4LX-xtCjuPaojrWu5pmYw';

// ↓config.js の GAS_SECRET_TOKEN と同じ文字列にすること
const SECRET_TOKEN = 'okd112358';

// 各シートの1行目(ヘッダー)定義。初回アクセス時に自動作成されます。
const SHEET_SCHEMAS = {
  Todo: ['id', 'title', 'deadline', 'effort', 'priority', 'done', 'updatedAt'],
  Tomorrow: ['id', 'title', 'memo', 'done', 'updatedAt'],
  Reminders: ['id', 'title', 'type', 'value', 'updatedAt'], // type: monthly|weekly, value: 日付(1-31) or 曜日(0-6)
  Memo: ['id', 'content', 'updatedAt'],
  // id = "{campus}__{grade}" で一意化。校舎×学年の組み合わせで1行
  Stats: ['id', 'campus', 'grade', 'enrolled', 'recruit', 'withdrawn', 'suspended', 'sourceUrl', 'updatedAt'],
};

function doGet(e) {
  try {
    if (e.parameter.token !== SECRET_TOKEN) return jsonResponse({ error: 'unauthorized' }, 401);
    const sheetName = e.parameter.sheet;
    if (!SHEET_SCHEMAS[sheetName]) return jsonResponse({ error: 'invalid sheet' }, 400);
    const rows = readSheet(sheetName);
    return jsonResponse({ data: rows });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== SECRET_TOKEN) return jsonResponse({ error: 'unauthorized' }, 401);
    const sheetName = body.sheet;
    if (!SHEET_SCHEMAS[sheetName]) return jsonResponse({ error: 'invalid sheet' }, 400);

    if (body.action === 'upsert') {
      upsertRow(sheetName, body.payload);
    } else if (body.action === 'delete') {
      deleteRow(sheetName, body.payload.id);
    } else if (body.action === 'replaceAll') {
      // Memo/Statsのような「常に全件書き換え」向け
      replaceAllRows(sheetName, body.payload.rows);
    } else {
      return jsonResponse({ error: 'invalid action' }, 400);
    }
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

// ---- 内部ヘルパー ----

function getSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(SHEET_SCHEMAS[sheetName]);
  }
  return sheet;
}

function readSheet(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '')) // 空行除外
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function upsertRow(sheetName, payload) {
  const sheet = getSheet_(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const idKey = headers[0]; // 先頭列をID相当のキーとして扱う
  payload.updatedAt = new Date().toISOString();
  if (!payload[idKey]) payload[idKey] = Utilities.getUuid();

  const data = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload[idKey])) {
      targetRow = i + 1; // シートは1始まり
      break;
    }
  }
  const rowValues = headers.map(h => (payload[h] !== undefined ? payload[h] : ''));
  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function deleteRow(sheetName, id) {
  const sheet = getSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function replaceAllRows(sheetName, rows) {
  const sheet = getSheet_(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  sheet.clear();
  sheet.appendRow(headers);
  rows.forEach(r => (r.updatedAt = new Date().toISOString()));
  const values = rows.map(r => headers.map(h => (r[h] !== undefined ? r[h] : '')));
  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }
}

function jsonResponse(obj, statusCode) {
  // GASのContentServiceはHTTPステータスを自由に設定できないため、
  // エラー内容はJSONボディ側に含めてフロント側で判定します。
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
