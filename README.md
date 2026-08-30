# Planetarium

Three.js とブラウザ標準の ES Modules で動く、データ駆動型のインタラクティブ・プラネタリウムです。観測地と時刻を変えながら星空を眺めるライブ観測に加え、歴史的な天文イベント、星座図書室、撮影アルバムを 1 ページのアプリケーションとして提供します。

![プラネタリウム画面](images/planetarium.png)

## 主な機能

- **ライブ観測**: 19 のプリセット観測地から地点を選び、緯度・経度と時刻に応じた空を表示します。
- **天体表示**: 357 の恒星、46 の星座、太陽、月、惑星、天の川、星雲、流星、オーロラなどを Three.js で描画します。
- **時間制御**: 現在時刻との同期、任意日時からの加速・停止・逆行、時刻を固定した日送りに対応します。
- **観測レイヤー**: 星座線、赤経・赤緯線、天の赤道、黄道、銀河赤道、月軌道、方位、星の軌跡などを個別に切り替えられます。
- **Chrono Sky**: 歴史上の天文イベントを選ぶと、その日時・場所へ移動し、彗星や流星群などの演出を再生します。
- **星の図書室**: 星空で見つけた星座を本棚へ収蔵し、見つけ方や星座譚を閲覧できます。
- **フォトアルバム**: WebGL の描画結果を撮影し、フィルター、プレビュー、PNG ダウンロードを利用できます。
- **サウンドと地表**: BGM・環境音、水面・草原・砂漠・氷原の地表表現を切り替えられます。

恒星数、星座数、観測地点数は現在同梱しているデータの件数です。

## 必要な環境

- Node.js 18 以降
- npm
- WebGL を利用できるモダンブラウザ
- ローカルの静的 HTTP サーバー

ビルドツールやバックエンドはありません。ただし、`index.html` の import map が `node_modules/three` を参照するため、最初に依存パッケージのインストールが必要です。

## 起動方法

```bash
npm install
python3 -m http.server 8080
```

ブラウザで <http://localhost:8080> を開いてください。ES Modules を読み込むため、`index.html` を `file://` で直接開く方法は利用できません。

Python を使わない場合は、任意の静的サーバーでも起動できます。

```bash
npx http-server -p 8080 .
```

Google Fonts の取得にはインターネット接続が必要です。BGM はブラウザの自動再生制限に従い、最初のユーザー操作後に再生されます。

## 基本的な使い方

1. ホームの「星空を見る」を押し、入口を選びます。
2. ライブ観測では観測地を選択し、ドラッグで視点回転、ホイールでズームします。
3. 右側のパネルから表示レイヤー、地表、時間モード、BGM、環境音、自動回転を変更します。
4. 星や惑星を選ぶと詳細が表示されます。星座を発見すると図書室へ記録されます。
5. カメラボタンで現在の描画をアルバムへ保存できます。

選択できる入口は次の 4 つです。

| 入口 | 内容 |
| --- | --- |
| プラネタリウム | 観測地点を選んで現在または任意日時の空を観測 |
| Chrono Sky | 8 件の歴史イベントの日時・場所と専用演出を再現 |
| 書斎 | 発見済みの星座を 3D 本棚と詳細ページで閲覧 |
| アルバム | 撮影した星空の閲覧、削除、PNG ダウンロード |

## 時間モード

- **リアルタイム**: 端末の現在時刻に同期します。
- **カスタム**: 選択した日時を起点に、倍率を指定して時間を進めます。倍率には `0` や負数も指定できます。
- **固定時刻**: 時刻を保ったまま日付だけを進めます。日送りの倍率を指定できます。

## データを追加する

### 恒星

恒星の基礎データは `data/stars.js` の `BASE_STAR_DATA` にあります。`ra` と `dec` の単位は度です。

```js
{
    id: 'example-star',
    name: 'サンプル星',
    nameEn: 'Example Star',
    ra: 101.287155,
    dec: -16.716116,
    magnitude: -1.46,
    color: 0xdde8ff,
    glowColor: 0x8bb5ff,
    info: '恒星の説明。',
    featured: true
}
```

- 必須フィールドは `id` です。
- 星空へ正しく配置するには `ra` と `dec` も指定してください。
- `magnitude`、`distance`、`spectralType`、`temperature`、`colorHint`、`featured` などは任意です。
- `id` は星座データの参照キーになるため、既存データと重複させないでください。

### 星座

星座は `data/constellations.js` の `BASE_CONSTELLATION_DATA` に追加します。

```js
{
    id: 'example',
    name: 'サンプル座',
    description: '星座の説明',
    starIds: ['star-a', 'star-b'],
    lines: [
        ['star-a', 'star-b']
    ]
}
```

- `id` または `name` のどちらかが必須です。
- 描画には、`data/stars.js` に存在する ID を `starIds` と `lines` から参照します。
- `stars` 配列へ恒星定義を埋め込み、星座と同時にカタログへ登録することもできます。
- 図書室の文章を追加する場合は `data/constellationTales.js` と `data/constellationBookDetails.js` も更新します。

### カタログ API

独自のカタログを組み立てる場合は、`AstroCatalog` のインスタンス API を利用します。

```js
import { AstroCatalog } from './astroCatalog.js';

const catalog = AstroCatalog.createDefault();
catalog.registerStar(starDefinition);
catalog.registerConstellation(constellationDefinition);
```

実行中のシーンは初期化時に描画オブジェクトを生成します。初期化後にカタログだけを変更しても表示は自動再構築されないため、通常のデータ追加では `data/` を編集してページを再読み込みしてください。

## アーキテクチャ

`planetarium.js` が構成ルートです。ライブ観測用と Chrono Sky 用の 2 つの `Planetarium` インスタンスを生成し、UI と接続します。

```text
index.html / styles/
        |
        v
planetarium.js ---- ui/ ---- screenRouter / localStorage
        |
        v
core/planetarium.js ---- core/timeController.js
        |
        +---- astroCatalog.js ---- data/
        |
        +---- core/planetariumSystems.js ---- systems/ ---- utils/
```

- `core/` はシーンのライフサイクル、時間、音声、設定を管理します。
- `systems/` は星空や地表を構成する描画システムです。
- `utils/` は天文計算と暦計算を提供します。
- `ui/` は画面遷移、入力、各モード、アルバム、図書室を担当します。
- `data/` は恒星、星座、観測地、歴史イベント、星座譚のデータです。

`core/`、`systems/`、`utils/` から `ui/` への依存は禁止しており、テストで検証しています。

## ブラウザへの保存

サーバー側にはデータを送信しません。次の情報をブラウザの `localStorage` に保存します。

- 発見済み星座: `celestial-library-unlocked-v1`
- 撮影写真とメタデータ: `planetarium_album`
- ホーム・モード選択画面の BGM 音量: `planetarium-ui-bgm-volume`

サイトデータを消去すると、図書室とアルバムの内容も削除されます。写真は Data URL として保存するため、ブラウザのストレージ上限の影響を受けます。

## テストと構文チェック

```bash
npm test
npm run check
```

`npm test` は Node.js の組み込みテストランナーを使い、天文計算、時間制御、画面遷移、設定、BGM、図書室、撮影、描画バッチ、モジュールとアセットの参照整合性を検証します。

`npm run check` は `core/`、`systems/`、`ui/`、`utils/`、`data/` と主要エントリーポイントの JavaScript 構文を確認します。WebGL の見た目や操作を変更した場合は、ブラウザでもライブ観測と Chrono Sky の両方を確認してください。

## ディレクトリ構成

| パス | 役割 |
| --- | --- |
| `index.html` | 全画面の DOM と import map |
| `planetarium.js` | アプリケーションの構成と起動 |
| `astroCatalog.js` | 恒星・星座カタログの正規化と検索 |
| `core/` | アプリケーション状態、シーン、時間、音声、設定 |
| `systems/` | Three.js の描画システムと地表実装 |
| `ui/` | 画面・操作・各モードの UI |
| `ui/library/` | 星座図書室のストア、3D 本棚、詳細表示 |
| `utils/` | 天文・惑星・彗星の計算 |
| `data/` | 星空とコンテンツの構造化データ |
| `styles/` | 画面単位のスタイルシート |
| `tests/` | Node.js テスト |
| `scripts/` | SIMBAD を利用する恒星データ整備スクリプト |
| `assets/`, `images/`, `bgm/`, `env_sound/` | テクスチャ、画像、音声アセット |

## ライセンス

`package.json` では ISC ライセンスを指定しています。
