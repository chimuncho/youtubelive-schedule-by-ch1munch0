[推しスケ！＆推しマド！統合仕様台帳.md](https://github.com/user-attachments/files/35497106/default.md)
# 推しスケ！＆推しマド！ 統合仕様台帳

* **対象プロジェクト**: `youtubelive-schedule-by-ch1munch0`（推しスケ！＆推しマド！）
* **対象ファイル一覧**:
  * **設定・ドキュメント**: `config.js`, `readme.md`
  * **バックエンド**: `コード.txt`（Google Apps Script）
  * **フロントエンド**: `index.html`, `oshisuke.html`, `oshimado.html`
  * **Chrome拡張機能 (`oshimado-ss`)**: `manifest.json`, `background.js`, `content.js`
  * **ブックマークレット**: `ブックマークレット.txt`

---

## 1. 全体整合性サマリー＆要注意ポイント

システム全体のデータフロー（`config.js` → フロント3画面 / ブックマークレット → GAS API → スプレッドシート / `CacheService` / `localStorage` → Chrome拡張機能）において、**重大な仕様不整合や通信破綻はゼロ**であり、設計意図通りに一貫して実装されています。

### 運用・保守上の要注意ポイント（全3点）
1. **設定値の分散と手動同期の必要性**:
   * `config.js` に集約された `GAS_URL` や `CACHE_KEYS` 等は、読み込み失敗時の安全策として `index.html` / `oshisuke.html` / `oshimado.html` の3画面にフォールバックリテラルとして重複定義されています。
   * また、`ブックマークレット.txt` は外部スクリプトを読み込めない仕様上、`CFG.GAS_URL`、`CFG.TOKEN`、`CFG.BM_CACHE_KEY` をインラインで保持しています。
   * **運用ルール**: GASのWebアプリURL再発行や `rotateAdminToken` 実行時は、`config.js`、フロント3画面のフォールバック値、およびブックマークレットの該当箇所を漏れなく更新する必要があります。
2. **ブラウザキャッシュキーのオリジン分離**:
   * `config.js` 定義の3キーのうち、`LIVES` と `FULL` はフロント3画面（GitHub Pagesオリジン）の `localStorage` で相互非破壊マージ同期に使用され、`BM_TAGS`（`'oshisuke_bm_tags_cache_v2'`）はブックマークレット実行時（`www.youtube.com` オリジン）の `localStorage` で専用タグキャッシュとして使用されます。
3. **ポップアップ内チャット折りたたみの非同期判定**:
   * 拡張機能 `content.js` の `closeLiveChatIfOpen()` は、チャット開閉ボタンクリック直後に `collapsed` 属性を同期判定するため、YouTube側のDOM更新が1ティック遅れる場合は `MutationObserver` / 400msポーリングの次サイクルで完了確定します（動作上の支障なし）。

### 設計上の割り切り（レビュー対応見送り・判断記録）
個人開発（約200チャンネル規模）における運用コストと改修リスクのバランスを考慮し、以下の項目は意図的に現行仕様のままとしています（次回以降のレビュー時の再指摘防止用記録）。

* **ミニ窓の二重起動競合ガード未実装（旧指摘 L-1）**: ローカル拡張機能（`background.js`）との応答は数ミリ秒で完了するため、タイムアウト管理導入によるコード複雑化を避けるため見送り。
* **その他低優先度項目の現行維持（旧指摘 L-5 残り）**:
  * `updateChannelDirectory` の GAS 6分実行制限対策（約200チャンネル規模では実行時間に十分な余裕があるため見送り）
  * フロントキャッシュ読込時の `schemaVersion` 厳密検証（キャッシュキー名自体にバージョン番号を付与して世代分離しているため見送り）
  * URL長さ制限（300文字）の超過防止ガード、トークンの定数時間比較（タイミング攻撃対策）、およびインラインJS外部ファイル化による厳格CSP対応（現状規模・個人利用環境において実害がなく、改修コストに対してメリットが薄いため見送り）

---

## 2. システム統合仕様台帳（Master Contract Sheet）

### 2-1. 共通設定・定数・タイマー・閾値

| 項目 | 識別子・値 | 定義元 | 参照・利用箇所 | ステータス |
| :--- | :--- | :--- | :--- | :--- |
| **GAS Webアプリ URL** | `https://script.google.com/macros/s/AKfycbzKEjdp1EPCZ_8jCAvaGfTdOA9kCVBnau0XdnR9-uuj7kYlAbqp-jRQrAouMQnUSqPs/exec` | `config.js` (`GAS_URL`) | `index.html`, `oshisuke.html`, `oshimado.html`（各フォールバック有）、`ブックマークレット.txt` (`CFG.GAS_URL`) | **全箇所一致** |
| **キャッシュキー (配信枠)** | `'oshisuke_lives_cache_v8'` | `config.js` (`CACHE_KEYS.LIVES`) | `index.html`, `oshisuke.html`, `oshimado.html`（GitHub Pages `localStorage`） | **全箇所一致** |
| **キャッシュキー (全件)** | `'oshisuke_full_cache_v8'` | `config.js` (`CACHE_KEYS.FULL`) | `index.html`, `oshisuke.html`, `oshimado.html`（GitHub Pages `localStorage`） | **全箇所一致** |
| **キャッシュキー (BMタグ)** | `'oshisuke_bm_tags_cache_v2'` | `config.js` (`CACHE_KEYS.BM_TAGS`) | `ブックマークレット.txt` (`CFG.BM_CACHE_KEY`、YouTube `localStorage`) | **全箇所一致** |
| **旧キャッシュ互換キー** | `'yt_live_schedule_cache_v9'`, `'v8'` | `oshisuke.html`, `oshimado.html` | 読込フォールバックおよび読込直後の `localStorage.removeItem` 移行削除用（`oshisuke.html` / `oshimado.html` 共通） | **実装済み** |
| **自動更新間隔** | `180000` ms（3分） | `config.js` (`AUTO_REFRESH_INTERVAL_MS`) | `oshisuke.html`, `oshimado.html`（タイマー・タブ復帰時経過判定） | **全箇所一致** |
| **`New` バッジ表示上限** | `4`（`seenCount <= 4`） | `config.js` (`NEW_BADGE_MAX_SEEN`) / GAS `CONFIG` | `oshisuke.html`, `oshimado.html`, `コード.txt` | **全箇所一致** |
| **タグ自動折りたたみ閾値** | `localCount < 3`（対象件数3件未満で折りたたみ）<br>※配信スケジュール画面全体、およびチャンネル一覧でメインタグ選択中の動的サブタグは折りたたみ無効（全件表示） | `oshisuke.html`（`buildAvailableTagLists` / `computeLocalFolded`） | `oshisuke.html`（チャンネル一覧の初期折りたたみ制御） | **実装済み** |
| **手動登録トークン** | キー名: `'ADMIN_SECRET_TOKEN'` | GAS `ScriptProperties` | `コード.txt` (`doPost` 検証)、`ブックマークレット.txt` (`CFG.TOKEN`) | **実装済み** |

### 2-2. バックエンド API 仕様（GAS `doGet` / `doPost`）

| メソッド / パラメータ | 呼び出し元 | タイムアウト / 送信形式 | GAS側処理・返却ペイロード仕様 | ステータス |
| :--- | :--- | :--- | :--- | :--- |
| **`GET ?mode=summary`** | `index.html` | `12000` ms | `skipChannels: true` でキャッシュ読込。`liveCount`, `upcomingCount`, `channelCount`, `lastUpdated`, `lastUpdatedMs`, `lastAttemptedMs`, `updateStatus`, `errorSummary` を返却。 | **実装済み** |
| **`GET ?mode=schedule`** | `oshisuke.html`（初期・通常） | `15000` ms | `skipChannels: true` でキャッシュ読込。`lives`, `lastUpdated`, `lastUpdatedMs`, `lastAttemptedMs`, `updateStatus`, `errorSummary`, `tagOrder`, `tagMeta`, `channelCount` を返却。 | **実装済み** |
| **`GET ?mode=lives`** | `oshimado.html` | `15000` ms | `skipChannels: true` でキャッシュ読込。`lives`, `lastUpdated`, `lastUpdatedMs`, `lastAttemptedMs`, `updateStatus`, `errorSummary`, `tagOrder`, `tagMeta` を返却。 | **実装済み** |
| **`GET ?mode=tags`** | `ブックマークレット.txt`（Chページ） | `credentials: 'omit'` | 全件取得後、`channels` を `{ channelId, channelUrl, tags }` に軽量化し、`tagOrder`, `tagMeta` と共にJSON返却。 | **実装済み** |
| **`GET`（パラメータなし）** | `oshisuke.html`（Ch一覧タブ時） | `15000` ms | 全件ペイロード（`lives`, `channels`, メタ情報, `tagOrder`, `tagMeta`）を返却。 | **実装済み** |
| **`GET ?action=addMember` / `addChannel`** | 不正・旧形式リクエスト | - | セキュリティ保護のため拒否し、`POST (text/plain JSON)` 必須のエラーJSONを返却。 | **実装済み** |
| **`POST` (`action: 'addMember'`)** | `ブックマークレット.txt`（動画ページ） | `Content-Type: text/plain;charset=utf-8` JSONボディ | `token` 検証後、`YouTube.Videos.list` で状態確認。終了枠は削除、一般枠は `メン限手動枠` 除外＋キャッシュ反映、メン限枠は `メン限手動枠` 保存＋キャッシュ反映。 | **実装済み** |
| **`POST` (`action: 'addChannel'`)** | `ブックマークレット.txt`（Chページ） | `Content-Type: text/plain;charset=utf-8` JSONボディ | `token` 検証後、`YouTube.Channels.list` と `UU` 再生リストから情報取得し、`チャンネルディレクトリ` 追記/更新、`タグマスタ` 反映、`CacheService` 再構築。 | **実装済み** |

### 2-3. データストレージ・キャッシュ階層仕様（3層キャッシュ＆5シート）

| レイヤー | 対象・キー名 | 保存形式・構造・TTL・制御ロジック | ステータス |
| :--- | :--- | :--- | :--- |
| **第1層：ブラウザ `localStorage`** | `LIVES` / `FULL`（GitHub Pages） | `{ schemaVersion: 8, savedAtMs, payload }` 形式。`LIVES` は `channels` 除外、`FULL` は既存 `channels` を破壊せず配信枠・メタ情報のみ非破壊マージ保存。 | **実装済み** |
| **第1層：ブラウザ `localStorage`** | `BM_TAGS`（`www.youtube.com`） | `?mode=tags` のレスポンスJSONをそのままキャッシュ保存。`addChannel` 成功時（`data.ok`）に `removeItem` で破棄。 | **実装済み** |
| **第2層：GAS `CacheService`** | 本体: `'LIVE_SCHEDULE_JSON_V8'`<br>分割: `'LIVE_SCHEDULE_JSON_V8_CH_${genId}_${idx}'` | TTL `21600`秒（6時間）。`channels` 配列を約80KB（`81,920` bytes）単位で世代ID付きチャンクに分割保存。新世代書込後に旧世代チャンク削除、失敗時は全削除、読込欠損時は `null` 返却しシート再構築。 | **実装済み** |
| **第3層：スプレッドシート** | 1. `配信監視一覧`（読取）<br>2. `配信キャッシュ`（14列）<br>3. `メン限手動枠`（8列）<br>4. `チャンネルディレクトリ`（9列）<br>5. `タグマスタ`（3列） | `LockService` 排他制御下で `writeRowsSafely_` によりテキスト書式（`@`）設定＋一括 `setValues` 書込。定期トリガーは `updateLiveCache`（15分おき）と `updateChannelDirectory`（1日1回）。 | **実装済み** |

### 2-4. フロントエンド画面・UI・URL同期仕様

| 画面 / 機能 | 仕様・制御内容 | ステータス |
| :--- | :--- | :--- |
| **ポータル (`index.html`)** | `FULL` / `LIVES` のうち `savedAtMs` が新しいキャッシュで0秒初期描画後、`?mode=summary` で上部ステータスストリップ（配信中/予定/Ch数/更新日時/異常警告）を非同期更新。 | **実装済み** |
| **推しスケ！ (`oshisuke.html`)** | ・2ビュー切替（配信スケジュール / チャンネル一覧 `#channels`）・通信中切替時の自動遅延フル取得（`pendingForceFull` / `requestFullChannels`）<br>・2階層タグ（メイン/サブ）の動的抽出＆状況別折りたたみ制御（スケジュール画面はメイン・サブ全件展開、チャンネル一覧はメイン未選択時のみ `localCount < 3` 等で折りたたみ・メイン選択時の動的サブタグは全件展開）<br>・再読込クールダウン（`5000`ms）、異常/鮮度低下（30分）/停止疑い（45分）バッジ表示、イベント委譲による画像エラー処理（CSP親和性）。<br>・Live中カラーコード（カード枠線（2px）：#ff0033（`--live-red`）/カードの光彩：rgba(255, 0, 51, 0.28)（`--live-glow`）/「LIVE」バッジの背景：#ff0033、文字は #ffffff/開始時刻の文字色：#ff4d6d）<br>・まもなく配信開始（開始30分以内）カラーコード（カード枠線（1.5px）：rgba(251, 191, 36, 0.75)（#fbbf24＝`--warn-amber` の75%）/カードの光彩：rgba(251, 191, 36, 0.16)/開始時刻の文字色：#fbbf24）<br>・メン限カラーコード（カード枠線(2.5px Live中以外）rgba(43, 166, 64, 0.55)（#2ba640 の55%）/「メン限」バッジの文字色：#2ba640(背景はrgba(15, 15, 15, 0.9))/「メン限」バッジの枠線：rgba(43, 166, 64, 0.65)/開始時刻の文字色：#2ba640）| **実装済み** |
| **推しマド！ (`oshimado.html`)** | ・5レイアウト（`1x2`, `2chat`, `2x2`, `1plus3`, `3x2`）のDOM非破棄CSS Grid切替（`2chat` 下段は `minmax(min(425px, 54%), 1.1fr)` 確保）<br>・縮小レイアウト時の非表示枠自動停止＆ミュート退避、ソロ音声の可視枠自動移譲（昇格時のソロ維持ガード付）、チャット非表示時の `iframe` 破棄<br>・手動更新ボタンの通信中ロック＆5秒クールダウン<br>・ショートカット（`1`〜`6`: ソロ、`M`: 全ミュート、`U`: 全ミュート解除、`C`: チャット、`D`: ドロワー、`F`: 没入）<br>・URL状態同期（`?v=ID1,-,ID2&layout=...&main=1..6`）＆復元時初期全枠ミュート。 | **実装済み** |

### 2-5. Chrome拡張機能（`oshimado-ss` v1.3.3）連携プロトコル仕様

| 連携機能 | 送信元 → 受信先 | メッセージ型 / チャネル / 検証ルール | 処理内容 | ステータス |
| :--- | :--- | :--- | :--- | :--- |
| **起動ハンドシェイク** | `oshimado.html` ↔ `content.js`（トップフレーム） | `window.postMessage`（`OSHIMADO_EXT_PING` → `OSHIMADO_EXT_READY` `version: '1.3.3'`）<br>検証: `event.source === window && event.origin === OSHIMADO_ORIGIN` | 拡張機能の稼働検知。未導入時は待機なしで即 `window.open` フォールバックへ移行。 | **実装済み** |
| **高評価ミニ窓制御** | `oshimado.html` → `content.js` → `background.js` | `OSHIMADO_OPEN_WATCH_POPUP_REQ` → `chrome.runtime.sendMessage('OSHIMADO_OPEN_WATCH_POPUP')` → `OSHIMADO_OPEN_WATCH_POPUP_RES`<br>検証: `sender.origin` / `sender.url` プレフィックス / `WATCH_URL_RE` | `chrome.storage.session` に `popupWindowId` / `popupTabId` を永続保持し、SWスリープ後も同一ポップアップウィンドウのURL更新・フォーカスで再利用。 | **実装済み** |
| **ミニ窓限定自動制御** | `content.js`（`#oshimado_popup` トップフレーム） | URLハッシュ `#oshimado_popup` または `sessionStorage.oshimado_is_popup === '1'` | 通常タブには干渉せず、操作前（最大6秒）の `<video>.pause()`（クリック/`Space`/`K`で解除）および `ytd-live-chat-frame` の自動折りたたみを実行。 | **実装済み** |
| **原寸スクショ撮影** | `oshimado.html` ↔ `content.js`（埋め込みフレーム） | `iframe.contentWindow.postMessage`（`OSHIMADO_CAPTURE_REQUEST` → `OSHIMADO_CAPTURE_RESULT`）<br>検証: 送信側は `event.source === pending.iframeWindow`、受信側は `event.source === window.parent && event.origin === OSHIMADO_ORIGIN` | `<video>` を原寸 `<canvas>` に描画し、`推しマド_<枠>_<ラベル>_<日時>.png`（固定長確保＋最大80文字）としてダウンロード保存し結果を返却。 | **実装済み** |
| **埋め込み待機UI補正** | `content.js`（埋め込みフレーム） | `window.top !== window.self && location.ancestorOrigins[0] === OSHIMADO_ORIGIN` に `style#oshimado-embed-ui-fix` を注入 | 待機サムネイルの `background-size: contain` 化および「通知を受け取る」バーの横並び・狭幅（`<=520px`）コンパクト化。 | **実装済み** |

---

## 3. 各ステップ詳細記録ファイルへのインデックス

各ファイル内の全変数・定数・関数のデータ受け渡し（送り先・取得元）の網羅的記録は、以下の各ステップ記録ファイルに格納されています。

* **STEP 1 記録 (`ステップ1 仕様台帳＆詳細記録.md`)**: `config.js`、`コード.txt`（GAS全42関数）、`readme.md`
* **STEP 2 記録 (`ステップ2 仕様台帳＆詳細記録.md`)**: `index.html`（全6関数）、`oshisuke.html`（全9関数群）、`oshimado.html`（全12関数群）
* **STEP 3 記録 (`ステップ3 仕様台帳＆詳細記録.md`)**: `manifest.json`、`background.js`（全6関数・リスナー）、`content.js`（全12関数・ブロック）
* **STEP 4 記録 (`ステップ4 仕様台帳＆詳細記録.md`)**: `ブックマークレット.txt`（全9関数・リスナー）
