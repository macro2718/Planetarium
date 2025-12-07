# Planetarium

Three.js を使って星空をリアルタイム描画するデータ駆動型プラネタリウムです。恒星・星座のカタログを JSON 風オブジェクトとして管理し、構造化データを追加するだけで 3D シーンに自動反映されます。

## 特徴
- **データ駆動**: `data/stars.js` と `data/constellations.js` に定義したデータだけで星空を構築。
- **多層ビジュアル**: ミルキーウェイ、星座線、流星、月、オーロラなど複数のレンダリングシステムを組み合わせた表現。
- **惑星・衛星**: 太陽系主要惑星は VSOP87 ベースの長期精度要素で計算し、1000 年単位の時間ジャンプでも位置ずれを抑制。
- **操作性**: `OrbitControls` による視点操作と UI トグルで描画要素の ON/OFF が可能。
- **拡張性**: 実行時に `AstroCatalog` へ星や星座を登録できる API を提供。

## セットアップ
1. 依存ライブラリを取得します（`three` を npm で管理しています）。
   ```bash
   npm install
   ```
2. シンプルな静的サーバーを立ち上げます（ES Modules を扱うため file:// では動作しません）。
   ```bash
   npx http-server -p 8080 .
   ```
3. ブラウザで `http://localhost:8080` を開き、プラネタリウムを操作します。

> 静的サーバーの代わりに `python -m http.server 8080` などを使っても構いません。

## ディレクトリ構成の一例
- `planetarium.js`: シーン初期化と各描画システムの統合。
- `astroCatalog.js`: 恒星・星座データを管理する `AstroCatalog` クラス。
- `systems/`: 星雲、流星、星座線などのレンダリングシステム群。
- `ui/`: UI とのインタラクションや時刻表示の処理。
- `data/`: ベースとなる恒星・星座データセット。

## データを追加する
### 恒星を追加する
1. `data/stars.js` の `BASE_STAR_DATA` 配列にオブジェクトを 1 件追記します。
2. 必須フィールド: `id`, `name`, `ra`(赤経), `dec`(赤緯)。
3. 任意フィールド: `info`, `magnitude`, `color`, `glowColor`, `featured`, `distance`, `spectralType`, `temperature` など。未指定の値には `AstroCatalog` がデフォルトを補います。
4. 保存後にブラウザをリロードするとクリック情報や星座描画へ自動反映されます。

### 星座を追加する
1. `data/constellations.js` の `BASE_CONSTELLATION_DATA` にオブジェクトを追加します。
2. 必須フィールド: `id` か `name` のいずれか、`starIds`（恒星 ID の配列）、`lines`（`[startId, endId]` の配列）。
3. `stars` プロパティで星データをインライン登録すると、同時にカタログへ編入されます。
4. `color` や `description` で線色・解説を付けられます。

### ランタイムで登録する
- `AstroCatalog.registerStar(starDefinition)` : 実行中に恒星データを追加・更新。
- `AstroCatalog.registerConstellation(constellationDefinition)` : 星座と関連恒星をまとめて登録。

`AstroCatalog.createDefault()` を呼び出せば、ベースデータを読み込んだカタログが生成されます。そのまま `planetarium.js` で使用しているため、データ編集だけで新しい星空を拡張できます。

## ライセンス
MIT
