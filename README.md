# Planetarium

## データ駆動の星空設定

`astroCatalog.js` に `AstroCatalog` クラスを配置し、恒星/星座データは `data/stars.js` と `data/constellations.js` に分割しました。構造化されたデータを 1 件追加するだけで、画面側に自動的に反映されます。

### 恒星を追加する
1. `data/stars.js` の `BASE_STAR_DATA` に新しいオブジェクトを追加します。
2. 必須フィールドは `id`, `name`, `ra`, `dec`。そのほか `info`, `magnitude`, `color`, `featured` などは任意です。
3. 追加後にブラウザをリロードするだけで、恒星クリック情報・星座描画に反映されます。

### 星座を追加する
1. `data/constellations.js` の `BASE_CONSTELLATION_DATA` に `id`, `name`, `starIds`, `lines` を持つオブジェクトを追加します。
2. `starIds` には既存恒星 ID を指定するか、`stars` プロパティで星データをインライン登録できます（追加した星は自動でカタログに編入されます）。
3. 線の接続は `lines` 配列の `[startId, endId]` で定義します。

### 拡張 API
- `AstroCatalog.registerStar(starDefinition)` : ランタイムで星データを追加。
- `AstroCatalog.registerConstellation(constellationDefinition)` : 星座と関連星をまとめて登録。

これにより「コードロジックを触らずにデータ行を追加するだけで新しい星/星座を増やす」という拡張フローになります。