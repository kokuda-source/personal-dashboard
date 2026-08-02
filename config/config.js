// ============================================================
// config.js
// 実運用設定(.gitignoreにより GitHub には公開されません)
// ============================================================

export const CONFIG = {
  // ---- Google OAuth (Gmail / Calendar 用) ----
  GOOGLE_CLIENT_ID: '673532651528-6bmogmg1pvm8edf7vosq4eouak8a65ir.apps.googleusercontent.com',

  GOOGLE_SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' '),

  // ---- GAS (Google Apps Script) Web App ----
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyiF5tA_pM-W-kSUZEaT317hRzzHRhlpfHJJXatY_GgzFBozK8kjkaj6VsP2y5EtKhrTA/exec',
  GAS_SECRET_TOKEN: 'okd112358',

  // ---- ニュース取得 (RSS -> JSON変換) ----
  NEWS_RSS_URL: 'https://news.yahoo.co.jp/rss/categories/domestic.xml',
  RSS2JSON_API_KEY: '',

  // ---- クイックリンク ----
  MAIN_PORTAL_URL: 'https://kokuda-source.github.io/OKD_math_infomatics_main/',

  // Driveフォルダに限らず、日常的によく開く業務ツールをまとめて配置
  QUICK_LINKS: [
    { label: '創学ログ', url: 'https://docs.google.com/spreadsheets/d/1ukYpBC23NM0wRJkduGcvu0cQ3AYuHuEPTE0tIWa_Aek/edit?usp=drive_link' },
    { label: '問い合わせシート', url: 'https://docs.google.com/spreadsheets/d/1-wP8CpRlUiIjbHXNUXk1TKIWhIDKQNwFFnNAiPzIP0k/edit?usp=drive_link' },
    { label: '校舎MTGアジェンダ', url: 'https://docs.google.com/document/d/18qyJoWpIG56ztU8ORaad7LTXhn-YUnUgTieviXBOfdI/edit?usp=drive_link' },
    { label: '生徒情報共有', url: 'https://docs.google.com/spreadsheets/d/1OuF4BQypsj_IncghX8FLNCBcAtbiRacmbI9FfKXi06c/edit?usp=drive_link' },
    { label: 'ロイロノート', url: 'https://loilonote.app/_/' },
    { label: 'wowtalk', url: 'https://biz.wowtalk.org/webtalk/login' },
  ],

  DRIVE_LINKS: [
    // 特定のDriveフォルダを個別に追加したい場合はここに
    // { label: '高3ハイレベル 教材フォルダ', url: 'https://drive.google.com/drive/folders/XXXXXXXX' },
  ],

  // ---- 校舎リスト(実績カウンター初期表示用) ----
  CAMPUSES: ['姫路校', '姫路城西校'],
};
