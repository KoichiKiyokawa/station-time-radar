# AGENTS.md

## デプロイ

mainブランチへのpushでCloudflare側のGit連携により自動デプロイされる。
`wrangler deploy` を手動で叩く必要はない（ローカル動作確認用途を除く）。

## パッケージマネージャ

pnpm を使う（npm ではない）。
