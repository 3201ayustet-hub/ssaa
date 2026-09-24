# SSAA 修正版ファイル

今回の `42501 new row violates row-level security policy for table "ssaa_stays"` を止めるための修正版です。

## GitHubで置き換える
- `config.js` → このフォルダの `config.js`

## Supabase側
`ssaa_rls_fix.sql` はGitHubに置くだけではDBへ反映されません。
Supabase SQL Editorで **このSQLを1回だけ** 実行してください。

これまで作った確認用SQLを順番に実行する必要はありません。

この修正では既存の `ssaa_*` テーブルやデータを削除しません。
`ssaa_stays` のRLSだけでなく、SSAA専用4テーブルのRLSを同じ方針に統一します。
