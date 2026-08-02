# 個人用ポータルダッシュボード

仕事の開始時に1画面だけ開けば、メール確認・ToDo管理・スケジュール把握・
定期業務リマインド・ニュース・メモ・クイックリンク・ポモドーロ・
校舎別実績カウンターがすべて完結するダッシュボードです。

- ホスティング: GitHub Pages(静的ファイルのみ)
- データ保存: Googleスプレッドシート(GAS Web App経由、PC/スマホ間で同期)
- 認証: Google Identity Services(OAuthトークンモデル)

---

## 0. 全体の流れ

1. Googleスプレッドシートを1つ作成する
2. Google Apps Script(GAS)をそのスプレッドシートに紐付けてデプロイする
3. Google Cloud ConsoleでOAuthクライアントIDを作成する
4. `config/config.js` に各種URL・キーを設定する
5. GitHubリポジトリを作成し、GitHub Pagesで公開する

所要時間の目安: 初回30〜45分程度です。

---

## 1. Googleスプレッドシートの準備

1. [Google スプレッドシート](https://sheets.google.com) で新規スプレッドシートを作成
2. 好きな名前を付ける(例:「ダッシュボードDB」)
3. URLの `https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit` の
   **【ここがスプレッドシートID】** の部分をメモしておく(あとで使います)
4. シート(タブ)は自動で作成されるので、今は何も作らなくてOKです

---

## 2. GAS(Google Apps Script)のデプロイ

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を開く
2. デフォルトで表示される `Code.gs` の中身を全部削除し、このプロジェクトの
   `gas/Code.gs` の内容を丸ごと貼り付ける
3. 貼り付けたコードの中の以下2箇所を書き換える

   ```javascript
   const SHEET_ID = 'YOUR_SPREADSHEET_ID'; // 手順1でメモしたID
   const SECRET_TOKEN = 'set-a-long-random-string-here'; // 好きな長いランダム文字列
   ```

   `SECRET_TOKEN` は「知らない人にURLを推測されてもデータを見られない/
   書き換えられないようにする」ための簡易的な合言葉です。適当な長い文字列
   (例: パスワード生成ツールで作った32文字程度のランダム文字列)にしてください。

4. 画面右上の「デプロイ」→「新しいデプロイ」をクリック
5. 歯車アイコン→種類の選択で「ウェブアプリ」を選ぶ
6. 以下のように設定する
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
7. 「デプロイ」をクリックすると、認証画面が出るので自分のGoogleアカウントで許可する
8. 発行された **ウェブアプリのURL**(`https://script.google.com/macros/s/.../exec`)を
   コピーしておく(あとで使います)

> 補足: コードを修正した場合は「新しいデプロイ」ではなく「デプロイを管理」→
> 既存デプロイの鉛筆アイコン→バージョン「新バージョン」→デプロイ、で更新できます
> (これをしないと修正が反映されません)。

---

## 3. Google Cloud ConsoleでOAuthクライアントIDを作成

Gmail・Googleカレンダーへのアクセスに必要です。

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、
   新規プロジェクトを作成(または既存のものを使用)
2. 左メニュー「APIとサービス」→「有効なAPIとサービス」→「+ APIとサービスの有効化」で
   以下の2つを検索して有効化
   - Gmail API
   - Google Calendar API
3. 「APIとサービス」→「OAuth同意画面」を設定
   - User Type: **外部**(個人のGmailアカウントの場合)
   - アプリ名、サポートメールなど必須項目を入力
   - スコープの追加で `gmail.readonly` と `calendar.readonly` を追加
   - テストユーザーに自分のGoogleアカウントを追加
   - (個人利用なので「公開」の審査は不要。「テスト」ステータスのままでOK)
4. 「APIとサービス」→「認証情報」→「+ 認証情報を作成」→「OAuthクライアントID」
   - アプリケーションの種類: **ウェブアプリケーション**
   - 承認済みのJavaScript生成元に以下を追加
     - `https://<あなたのGitHubユーザー名>.github.io`
     - ローカルで動作確認したい場合は `http://localhost:8000` なども追加
5. 作成後に表示される **クライアントID**(`〜.apps.googleusercontent.com`)をコピー

---

## 4. ニュースRSSの確認(任意)

デフォルトでは Yahoo!ニュースの「国内」カテゴリRSSを設定しています。
教育系のニュースに絞りたい場合は、お好きなニュースサイトのRSSフィードURLに
差し替えてください(多くのニュースサイトはページ内に「RSS」リンクがあります)。

---

## 5. config.js の作成

1. `config/config.example.js` をコピーして `config/config.js` を作成
   ```
   cp config/config.example.js config/config.js
   ```
2. 中身を以下のように書き換える

   | 項目 | 値 |
   |---|---|
   | `GOOGLE_CLIENT_ID` | 手順3でコピーしたクライアントID |
   | `GAS_WEB_APP_URL` | 手順2でコピーしたウェブアプリURL |
   | `GAS_SECRET_TOKEN` | 手順2で設定したSECRET_TOKENと**同じ文字列** |
   | `NEWS_RSS_URL` | お好みのニュースRSS(手順4) |
   | `MAIN_PORTAL_URL` | 既に `https://kokuda-source.github.io/OKD_math_infomatics_main/` を設定済み |
   | `QUICK_LINKS` / `DRIVE_LINKS` | よく使うリンクを追加 |
   | `CAMPUSES` | 担当している校舎名の配列 |

3. `config.js` は `.gitignore` に登録済みなので、そのままGitHubにpushしても
   公開されません(誤って消さないよう注意してください)。

---

## 6. ローカルでの動作確認(任意だが推奨)

ブラウザの `file://` から直接開くとES Modulesの制約で正しく動かないため、
簡易サーバーを立てて確認します。

```bash
cd personal-dashboard
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いて確認してください。
(手順3のOAuthクライアントIDに `http://localhost:8000` を生成元として追加済みであることを確認)

---

## 7. GitHub Pagesへのデプロイ

1. GitHubで新しいリポジトリを作成(例: `personal-dashboard`)
2. このフォルダの中身をpush
   ```bash
   cd personal-dashboard
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<あなたのユーザー名>/personal-dashboard.git
   git push -u origin main
   ```
   ※ `config/config.js` は `.gitignore` によって自動的に除外されます
3. GitHubリポジトリの「Settings」→「Pages」を開く
4. 「Build and deployment」の「Source」で **Deploy from a branch** を選択
5. Branch を `main` / `/(root)` にして保存
6. 数分待つと `https://<あなたのユーザー名>.github.io/personal-dashboard/` で公開されます
7. 手順3のOAuthクライアントIDの「承認済みのJavaScript生成元」に、この
   `https://<あなたのユーザー名>.github.io` が登録済みであることを再確認してください

> 注意: GitHub Pagesは公開リポジトリでのみ無料で使えます(個人アカウントの場合)。
> `config.js` は除外されていますが、リポジトリ自体は誰でも閲覧できる状態になる
> 点は理解した上で運用してください。

---

## 8. スマホからの利用

公開されたURL(`https://<ユーザー名>.github.io/personal-dashboard/`)を
スマホのブラウザで開くだけで、PCと同じデータ(ToDo・メモ・実績カウンター等)が
Googleスプレッドシート経由で同期されます。ホーム画面に追加しておくと
アプリのように開けて便利です。

- iPhone: Safariで開く→共有ボタン→「ホーム画面に追加」
- Android: Chromeで開く→メニュー→「ホーム画面に追加」

---

## 9. 【重要】校舎別実績カウンターの仕様変更に伴う移行手順

校舎別実績カウンターが「校舎ごと」から「校舎×学年(高1/高2/高3)ごと」に変更され、
スプレッドシートの列構成(スキーマ)が変わりました。既に一度GASをデプロイ済みの方は、
以下の対応が必要です。

1. `gas/Code.gs` の中身を、今回更新した内容で**まるごと上書き**する
2. スプレッドシートを開き、**「Stats」シートのタブを削除**する
   (右クリック→削除。列構成が古いままだとデータがズレて保存されるため)
3. Apps Scriptの「デプロイを管理」→ 既存デプロイの鉛筆アイコン→
   バージョン「新バージョン」を選んで**再デプロイ**する
4. ダッシュボードを開き直すと、「Stats」シートが新しい列構成
   (`id, campus, grade, enrolled, recruit, withdrawn, suspended, sourceUrl, updatedAt`)
   で自動的に再作成されます

## 10. よくあるトラブル

| 症状 | 原因・対処 |
|---|---|
| ToDo等を追加してもスプレッドシートに反映されない | `config.js` の `GAS_SECRET_TOKEN` と `Code.gs` の `SECRET_TOKEN` が一致しているか確認。GASのコードを直した場合は「新バージョンでデプロイ」を忘れていないか確認 |
| Googleサインインを押しても何も起きない(特にスマホ) | ポップアップブロックの可能性。ブラウザのポップアップ許可設定を確認 |
| Gmail/カレンダーが「取得に失敗しました」と出る | アクセストークンは約1時間で失効します。再度サインインボタンを押してください |
| ニュースが表示されない | RSS2JSONの無料枠(1日あたりの上限)を超えている可能性。時間をおくか `RSS2JSON_API_KEY` を取得して設定してください |
| GitHub Pagesで真っ白のまま | ブラウザの開発者ツール(コンソール)を開いてエラーを確認。多くは `config.js` の未作成、またはパスの誤りです |

---

## 11. ディレクトリ構成

```
personal-dashboard/
├── index.html              # ダッシュボード本体
├── css/
│   ├── theme.css             # 配色・フォントのデザイントークン
│   └── style.css             # レイアウト・コンポーネント
├── js/
│   ├── main.js                # 初期化・テーマ切替・全体制御
│   ├── auth/google-auth.js    # Google OAuth(Gmail/Calendar用)
│   ├── modules/
│   │   ├── gmail.js             # 未読メール・要返信抽出
│   │   ├── calendar.js          # 今日/明日の予定
│   │   ├── todo.js              # ToDo・明日やること
│   │   ├── reminder.js          # 定期業務リマインド
│   │   ├── news.js              # 教育ニュース取得
│   │   ├── memo.js              # メモ帳(自動保存)
│   │   ├── pomodoro.js          # ポモドーロタイマー
│   │   ├── stats.js             # 校舎別実績カウンター
│   │   └── quicklinks.js        # クイックリンク描画
│   └── utils/
│       ├── gas-client.js        # GAS Web Appとの通信
│       ├── storage.js           # localStorageラッパー
│       └── date.js              # 日付・締切計算
├── config/
│   ├── config.example.js      # 設定テンプレート(公開OK)
│   └── config.js              # 実設定(.gitignoreで除外)
├── gas/
│   └── Code.gs                # スプレッドシート側APIプロキシ
└── .gitignore
```

## 12. 今後の拡張アイデア

- 「要返信メール」抽出をキーワード方式からClaude API等のAI判定に差し替える
  (`js/modules/gmail.js` の `scoreNeedsReply()` を拡張)
- 通知機能(Web Push)を追加して、定期業務リマインドをプッシュ通知にする
- ToDoの完了率を可視化するミニグラフを追加する
