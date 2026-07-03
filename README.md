# Station Time Radar

起点となる駅を1つ選ぶと、主要駅への電車の所要時間をレーダー表示で一望できるアプリ。

- 起点を中心に、行き先を実際の地理方位角・所要時間で放射状に配置
- 所要時間順のリスト表示、路線カラー・乗換回数・IC運賃を併記
- 行き先はプリセット + 自由に追加/削除（localStorage永続化）
- バックエンドなしの静的SPA。経路検索は [api.transit.ls8h.com](https://api.transit.ls8h.com/)（非公式・認証不要のGTFS/ODPTベース乗換案内API）を直接呼び出す

## Stack

Vite + SolidJS + TypeScript + Tailwind CSS v4

## Usage

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に静的ビルドを出力
```

## Deploy

Cloudflare Workers（静的アセット配信）にデプロイ:

```bash
npm run build
npx wrangler deploy
```

## Data Attribution

交通データは各事業者の GTFS / ODPT 等に基づく。ライセンス・帰属表示はアプリ内フッターの「出典・ライセンス」から確認できる。
