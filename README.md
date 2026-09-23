# 日本全国陣取りゲーム

旅行によって都道府県を獲得し、4人で日本全国を塗り分けていくモバイルファーストゲーム。

## Stack
- Next.js + TypeScript
- Supabase / PostgreSQL / Storage
- SVG-based Japan map

## Setup
1. `npm install`
2. `.env.local.example` を `.env.local` にコピー
3. Supabase プロジェクトを作成し、`supabase_schema.sql` を実行
4. `npm run dev`

## Notes
- 認証はMVPでは実装しない。
- 重要なゲーム判定はサーバー側で検証する。
- `components/JapanMap.tsx` の地図データは、ライセンスを確認した47都道府県SVGデータへ差し替える。
