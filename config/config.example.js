// ============================================================
// config.example.js
// このファイルをコピーして「config.js」という名前で
// 同じフォルダ内に作成し、下記の値を実際の値に書き換えてください。
//
//   cp config.example.js config.js
//
// config.js は .gitignore に登録されているため GitHub には
// アップロードされません（秘密情報を守るためです）。
// ============================================================

export const CONFIG = {
  // ---- Google OAuth (Gmail / Calendar 用) ----
  // Google Cloud Console > APIとサービス > 認証情報 で作成した
  // 「OAuth 2.0 クライアントID」の値を入れてください
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  // Gmail / Calendar への読み取り専用アクセス権限
  GOOGLE_SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' '),

  // ---- GAS (Google Apps Script) Web App ----
  // gas/Code.gs をデプロイした際に発行される URL
  // 例: https://script.google.com/macros/s/XXXXXXXX/exec
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

  // gas/Code.gs 側の SECRET_TOKEN と同じ文字列にしてください
  // (第三者による不正なアクセス・書き込みを防ぐための簡易トークン)
  GAS_SECRET_TOKEN: 'set-a-long-random-string-here',

  // ---- ニュース取得 (RSS -> JSON変換) ----
  // rss2json 経由で取得する教育系ニュースのRSSフィードURL
  // 例: Yahoo!ニュース「教育」カテゴリなど、お好みのRSSに差し替え可能
  NEWS_RSS_URL: 'https://news.yahoo.co.jp/rss/categories/domestic.xml',
  // rss2json の無料APIキー(任意。未設定でも少量なら動作します)
  RSS2JSON_API_KEY: '',

  // ---- クイックリンク ----
  MAIN_PORTAL_URL: 'https://kokuda-source.github.io/OKD_math_infomatics_main/',

  QUICK_LINKS: [
    { label: '教材ポータル', url: 'https://kokuda-source.github.io/OKD_math_infomatics_main/' },
    // 必要に応じて追加
    // { label: '成績管理システム', url: 'https://example.github.io/xxx/' },
  ],

  DRIVE_LINKS: [
    // { label: '高3ハイレベル 教材フォルダ', url: 'https://drive.google.com/drive/folders/XXXXXXXX' },
    // { label: '共通テスト国語演習 資料', url: 'https://drive.google.com/drive/folders/XXXXXXXX' },
  ],

  // ---- 校舎リスト(実績カウンター初期表示用) ----
  CAMPUSES: ['姫路校', '本校'],
};
