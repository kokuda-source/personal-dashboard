/**
 * ============================================================
 * 個人用ポータルダッシュボード - GAS バックエンド
 * ============================================================
 * 【認証方式(重要)】
 * フロントエンドから送られてくる「Googleアクセストークン」を、この
 * スクリプトがGoogle自身に問い合わせて検証します。
 *   1. トークンが本物か(Google発行のものか)
 *   2. どのGoogleアカウントのものか(email)
 *   3. そのemailが ALLOWED_EMAILS に含まれているか
 * の3点をすべて満たした場合のみ、読み書きを許可します。
 * これにより、config.js やこのURLが第三者に見られても、
 * 実際にあなたのGoogleアカウントでログインしない限り
 * データにはアクセスできません。
 *
 * 使い方:
 *  1. script.google.com で新規プロジェクトを作成し、このファイルの
 *     内容を貼り付ける
 *  2. SHEET_ID / OAUTH_CLIENT_ID / ALLOWED_EMAILS を自分の値に書き換える
 *  3. 「デプロイ」>「新しいデプロイ」>種類「ウェブアプリ」
 *     - 次のユーザーとして実行: 自分
 *     - アクセスできるユーザー: 全員
 *  4. 発行されたURLを config.js の GAS_WEB_APP_URL に設定する
 * ============================================================
 */

// ↓自分のスプレッドシートのID(URLの /d/ と /edit の間の文字列)
const SHEET_ID = '1e_FRCsA7IVAKCITl74e1iO4LX-xtCjuPaojrWu5pmYw';

// ↓config.js の GOOGLE_CLIENT_ID と同じ値にすること
// (この値と一致するアクセストークンだけを正規のものとして受け付ける)
const OAUTH_CLIENT_ID = '673532651528-6bmogmg1pvm8edf7vosq4eouak8a65ir.apps.googleusercontent.com';

// ↓データの読み書きを許可するGoogleアカウントのメールアドレス一覧
// (あなた自身のGmailアドレスを入れてください。複数人に許可する場合は
//  配列に追加できます)
const ALLOWED_EMAILS = ['k_okuda@sougakugr.jp'];

// 各シートの1行目(ヘッダー)定義。初回アクセス時に自動作成されます。
const SHEET_SCHEMAS = {
  Todo: ['id', 'title', 'deadline', 'effort', 'priority', 'done', 'updatedAt'],
  Tomorrow: ['id', 'title', 'memo', 'done', 'updatedAt'],
  Reminders: ['id', 'title', 'type', 'value', 'updatedAt'], // type: monthly|weekly, value: 日付(1-31) or 曜日(0-6)
  Memo: ['id', 'content', 'updatedAt'],
  // id = "{campus}__{grade}" で一意化。校舎×学年の組み合わせで1行
  Stats: ['id', 'campus', 'grade', 'enrolled', 'recruit', 'withdrawn', 'suspended', 'sourceUrl', 'updatedAt'],
};

// 読み取り・書き込みとも、すべてPOSTのみで受け付ける
// (GETのクエリパラメータにトークンを含めるとアクセスログ等に残る
//  リスクがあるため、あえてGETは使わない設計にしている)
function doGet(e) {
  return jsonResponse({ error: 'このAPIはPOSTのみ対応しています' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    const email = verifyAccessToken_(body.accessToken);
    if (!email) return jsonResponse({ error: 'unauthorized: 有効なGoogleログインが必要です' });
    if (ALLOWED_EMAILS.indexOf(email) === -1) return jsonResponse({ error: 'forbidden: このアカウントには権限がありません' });

    const sheetName = body.sheet;
    if (!SHEET_SCHEMAS[sheetName]) return jsonResponse({ error: 'invalid sheet' });

    if (body.action === 'read') {
      return jsonResponse({ data: readSheet(sheetName) });
    } else if (body.action === 'upsert') {
      upsertRow(sheetName, body.payload);
      return jsonResponse({ success: true });
    } else if (body.action === 'delete') {
      deleteRow(sheetName, body.payload.id);
      return jsonResponse({ success: true });
    } else if (body.action === 'replaceAll') {
      replaceAllRows(sheetName, body.payload.rows);
      return jsonResponse({ success: true });
    }
    return jsonResponse({ error: 'invalid action' });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

/**
 * Googleのtokeninfoエンドポイントにアクセストークンを問い合わせて、
 * ・正規のトークンか
 * ・自分のOAuthクライアント向けに発行されたものか(なりすまし防止)
 * ・メールアドレスが確認済みか
 * を検証し、問題なければメールアドレスを返す。不正なら null を返す。
 */
function verifyAccessToken_(accessToken) {
  if (!accessToken) return null;
  try {
    const res = UrlFetchApp.fetch(
      'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + encodeURIComponent(accessToken),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;

    const info = JSON.parse(res.getContentText());
    if (info.aud !== OAUTH_CLIENT_ID) return null; // 別アプリ向けトークンのなりすまし防止
    if (!info.email) return null;
    if (info.email_verified !== 'true' && info.email_verified !== true) return null;

    return info.email;
  } catch (err) {
    return null;
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

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
