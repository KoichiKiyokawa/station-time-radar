# AGENTS.md

## デプロイについて

**mainブランチにコミットが積まれると、Cloudflare側のGit連携により自動デプロイされる。**
手動で `wrangler deploy` を叩く必要は基本的にない。

- デプロイ先: https://station-time-radar.koichi20110068.workers.dev
- ビルド・デプロイはCloudflare（Workers Builds）が担当。GitHub Actions等のCIは組んでいない
- `wrangler deploy` はローカルでの動作確認・デバッグ目的でのみ使う（本番反映はmainへのpushで行う）

## パッケージマネージャ

`pnpm` を使う（npmではない）。`pnpm install` / `pnpm dev` / `pnpm build`。

## 開発時の注意

- APIは `https://api.transit.ls8h.com`（非公式・認証不要）を直接叩く静的SPA。バックエンドは存在しない
- 経路検索(`/api/v1/plan`)は1リクエストあたり5〜15秒程度かかることがある。行き先ごとに同時実行数3で並列化している（`src/store.ts` の `createLimiter`）
- 経路結果は `sessionStorage`（`src/lib/routeCache.ts`）にキャッシュ。「今すぐ」検索は3分TTL、固定時刻検索はその日の日付が変わるまで有効
- 駅名の同一判定は駅名文字列ベース（`src/store.ts` の `destKey`）。同名駅は路線・データソースによって座標が僅かにずれるため、座標一致ではなく名前で同一視している
