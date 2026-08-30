# AGENTS.md

このファイルはリポジトリ全体に適用される作業ガイドです。

## プロジェクト概要

Planetarium は、Three.js とブラウザ標準の ES Modules で構成された静的 Web アプリケーションです。バンドラー、フレームワーク、バックエンドはありません。`index.html` の import map が npm で導入した `three` を解決し、`planetarium.js` がアプリケーションを起動します。

## セットアップと確認コマンド

```bash
npm install
python3 -m http.server 8080
```

ブラウザでは <http://localhost:8080> を開きます。`file://` では ES Modules とアセットを正しく読み込めません。

変更後の基本確認は次の 2 つです。

```bash
npm test
npm run check
```

- `npm test` は `node --test tests/*.test.mjs` を実行します。
- `npm run check` はアプリケーションの JavaScript を `node --check` で検証します。
- UI、WebGL、音声、画面遷移を変更した場合は、ブラウザでの手動確認も行ってください。
- ドキュメントだけの変更でも、リンクや記載したコマンドが現状と一致することを確認してください。

## 主要な構成

- `planetarium.js`: 構成ルート。ライブ用とアーカイブ用の `Planetarium` を UI へ接続する。
- `core/`: ライフサイクル、シーン、時間、音声、設定。DOM 固有の表示ロジックは置かない。
- `systems/`: Three.js の描画機能。システム生成関数は共有コンテキスト `ctx` を受け取る。
- `utils/`: DOM に依存しない天文・暦計算。
- `ui/`: DOM、入力、画面遷移、各モード。
- `ui/library/`: 図書室の永続化、表示モデル、3D 本棚、詳細ビュー。
- `data/`: 恒星、星座、観測地、歴史イベント、星座コンテンツ。
- `tests/`: Node.js 組み込みテストランナーによるテスト。
- `vendor/`: ローカルに保持する外部コード。依存更新以外では編集しない。

## アーキテクチャ上のルール

### 依存方向

- `core/`、`systems/`、`utils/` から `ui/` を import しないでください。`tests/moduleGraph.test.mjs` がこの境界を検証します。
- UI とコアの接続は `planetarium.js` で行います。
- ローカルモジュールの import には相対パスと `.js` 拡張子を明記してください。
- Three.js 本体は `three.module.js`、OrbitControls は `vendor/three/addons/controls/OrbitControls.js` を通す既存の解決方法に合わせてください。

### Planetarium と描画システム

- `Planetarium` はライブ観測用と Chrono Sky 用に別インスタンスがあります。現在の対象は `ui/planetariumContext.js` から取得し、単一のグローバルインスタンスを前提にしないでください。
- 新しい描画機能は原則として `systems/` に生成関数を追加し、`core/planetariumSystems.js` で組み立てます。
- 毎フレーム更新が必要なシステムは返り値に `update` 関数を持たせ、ファクトリ経由で updater に登録します。
- Three.js のジオメトリ、マテリアル、テクスチャ、イベントリスナーを追加した場合は、停止・破棄時に解放できるようライフサイクルも更新してください。
- 高コストなジオメトリ生成や DOM 更新を毎フレーム行わないでください。既存のバッチ描画と更新頻度の設計を維持します。

### 画面と設定

- 管理対象画面の切り替えは `ui/screenRouter.js` の `SCREEN_ROUTES` と `navigateTo()` を使います。各機能から複数画面の `hidden` クラスを個別に操作しないでください。
- 主要な表示トグルを追加する場合は、`core/settingRegistry.js` の descriptor を正とし、必要に応じて `index.html` のボタン、設定同期、テストを一緒に更新してください。
- 観測地点のデフォルト値は `core/settings.js`、プリセットは `data/locations.js` に置きます。
- DOM が存在しない Node.js テストでも import できるよう、モジュール評価時の `window`、`document`、`localStorage` 参照には注意してください。必要なら `typeof` や依存注入でガードします。

### データと永続化

- 恒星 ID はカタログ全体で一意にし、星座の `starIds` と `lines` から同じ ID を参照します。赤経 `ra` と赤緯 `dec` の単位は度です。
- 星座を追加するときは `data/constellations.js` だけでなく、必要に応じて `data/constellationTales.js` と `data/constellationBookDetails.js` も更新してください。
- Chrono Sky のイベントは `data/historicalEvents.js` に置きます。`dateTime` はタイムゾーンを明示できる ISO 8601 形式を使い、観測地点と effects の組み合わせを確認してください。
- 保存済みデータとの互換性を保ってください。現在の localStorage キーは `celestial-library-unlocked-v1`、`planetarium_album`、`planetarium-ui-bgm-volume` です。キーや保存形式を変更する場合は移行処理とテストを追加します。
- `scripts/update_stars.py` は `data/stars.js` 全体を書き換え、状況により `missing-stars.txt` を作成または削除します。さらに `numpy`、`astroquery`、ネットワーク上の SIMBAD を必要とするため、恒星データの一括更新が依頼された場合だけ実行してください。

## コーディング規約

- 既存コードに合わせ、JavaScript は 4 スペースインデント、シングルクォート、セミコロンを基本とします。
- ES Modules の named export を優先します。
- 関数は責務を小さく保ち、天文計算や正規化は副作用のない関数として `utils/` または適切なデータモジュールへ切り出します。
- 不足しているブラウザ API や DOM 要素に対しては、既存の optional chaining と早期 return の方針に合わせます。
- ユーザー向け文言は既存画面に合わせて日本語を基本とし、英語ラベルを併記する場合は周囲の表記に揃えます。
- アセットはリポジトリ内からの相対パスで参照します。ファイル名や配置を変更した場合は HTML、CSS、JavaScript の全参照を更新してください。
- 無関係な整形や大規模なデータ並べ替えを同じ変更へ混ぜないでください。特に `data/stars.js` は大きいため、目的のエントリだけを編集します。

## テスト方針

- 不具合修正では、可能なら修正前に失敗し修正後に通る回帰テストを追加します。
- 計算ロジックはブラウザや Three.js のレンダラーに依存させず、Node.js で直接テストできる形を優先します。
- DOM やブラウザ API をスタブするテストでは、テスト終了時に変更した global を必ず復元してください。
- 画面を追加・変更したら `tests/screenRouter.test.mjs`、設定を追加したら `tests/settingRegistry.test.mjs`、モジュールやアセット参照を変更したら `tests/moduleGraph.test.mjs` の期待値を確認します。
- 恒星・星座の描画対象を変えた場合は `tests/constellationBatching.test.mjs`、時間計算を変えた場合は `tests/timeController.test.mjs` と `tests/astronomy.test.mjs` を確認します。

## 作業完了時

- `git diff --check` で空白エラーがないことを確認します。
- `npm test` と `npm run check` の結果を報告します。実行できない確認があれば理由を明記します。
- UI 変更では、確認した画面、操作、ブラウザを報告します。
- 新しい依存、生成物、保存形式、外部通信を追加した場合は README も更新します。
