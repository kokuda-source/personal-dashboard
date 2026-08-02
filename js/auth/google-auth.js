// ============================================================
// google-auth.js
// Google Identity Services (GIS) のトークンモデルによるOAuth認証
//
// 注意点:
//  ・バックエンドを持たない構成のため「アクセストークン」のみを扱う
//    (リフレッシュトークンは取得できない = 約1時間で失効する)
//  ・失効したら再度サインインボタンを押してもらう設計にする
//  ・iOS Safari等はポップアップがブロックされやすいため、
//    必ずユーザーのクリック操作を起点に呼び出すこと(自動実行しない)
// ============================================================

import { CONFIG } from '../../config/config.js';
import { getItem, setItem, removeItem } from '../utils/storage.js';

let tokenClient = null;
let accessToken = null;
let onTokenReadyCallback = null;

/** ページ読み込み時に一度だけ呼ぶ初期化処理 */
export function initGoogleAuth(onTokenReady) {
  onTokenReadyCallback = onTokenReady;

  // sessionStorageにキャッシュされた有効なトークンがあれば再利用
  const cached = getItem('google_token_cache', null);
  if (cached && cached.expiresAt > Date.now()) {
    accessToken = cached.token;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: CONFIG.GOOGLE_SCOPES,
    callback: (response) => {
      if (response.error) {
        console.error('[google-auth] token error', response);
        return;
      }
      accessToken = response.access_token;
      // 通常3600秒。安全マージンを引いてキャッシュする
      const expiresAt = Date.now() + (response.expires_in - 60) * 1000;
      setItem('google_token_cache', { token: accessToken, expiresAt });
      if (onTokenReadyCallback) onTokenReadyCallback(accessToken);
    },
  });

  // 起動時にキャッシュ済みトークンがあれば即座にコールバックを発火
  if (accessToken && onTokenReadyCallback) {
    onTokenReadyCallback(accessToken);
  }
}

/** サインインボタン押下時に呼ぶ(ユーザー操作起点であることが必須) */
export function requestSignIn() {
  if (!tokenClient) {
    console.error('[google-auth] not initialized yet');
    return;
  }
  tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
}

export function getAccessToken() {
  return accessToken;
}

export function isSignedIn() {
  return !!accessToken;
}

export function signOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  removeItem('google_token_cache');
}
