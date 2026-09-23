# 日本全国陣取りゲーム — MVP実装ファイル

このZIPは、iPhoneからGitHubへ手動アップロードしやすいよう、**プロジェクト直下1階層**にファイルを置いています。

## まず確認すること

- `index.html` が入口です。
- `config.js` のSupabase URL / anon keyが空のままなら、**ローカルデモモード**で動きます。
- `supabase.sql` をSupabase SQL Editorで実行すると、実データ保存の基盤を作れます。
- `stay-photos` というStorage bucketを作成してください。
- `config.js` にProject URLとanon keyを入れてからGitHub Pages等へ公開します。

## GitHubへの入れ方

1. GitHubで対象リポジトリを開く。
2. `Add file` → `Upload files`。
3. ZIPを展開した**中身のファイルをそのまま**アップロードする。
4. `Commit changes`。
5. GitHub Pagesで公開する場合は Settings → Pages から `main / root` を選ぶ。

## 今回の実装で入っているもの

- 4人のプレイヤー登録
- 名前 / 居住県 / 4色
- ゲーム開始
- 現在の居住県を全員共通で対象外
- 47都道府県の地図表示
- 県名を地図上へ自動配置
- 県タップで所有者 / 最新取得日
- 旅行記録
- 滞在日 / 種別 / 写真1枚 / コメント
- 登録前確認
- 登録後の変更・削除不可
- 最新滞在による所有権
- 同日複数プレイヤー登録 → ブランク
- プレイヤー詳細
- 所有県数 / 期間ポイント / 累積ポイント
- 地方制覇判定
- 制覇中1.5倍
- 管理画面
- プレイヤー変更
- ポイント設定
- 決着 / 決着履歴
- 決着後も地図を維持
- Supabase Storageへの写真アップロード基盤
- Supabase用SQL/RLS

## 重要

この版は「画面を作っただけ」ではなく、**要件定義書のゲームルールをフロント側で通し、Supabase接続時のDB構造まで合わせたMVP**です。

一方、公開運用前には以下を必ず確認してください。

- Supabase Storageのポリシー
- 管理操作をURLだけで許可する運用リスク
- 月次ポイント関数をSupabase Cron等で毎月1日に実行する設定
- 本番用の写真サイズ圧縮
- 県データのライセンス表示

## 地図について

地図は既存ゲームの素材ではなく、都道府県境界を持つオープンなSVG地図を読み込み、アプリ側で色・ラベル・状態をゲームUIとして描画します。

使用している地図データ:
Geolonia `japanese-prefectures` の `map-mobile.svg`
https://github.com/geolonia/japanese-prefectures

この地図はWikipediaの日本地図.svgをベースとしたGFDLのデータとして配布されています。利用時は元リポジトリのライセンス条件を確認してください。

## デモモードの注意

デモモードの写真はブラウザのlocalStorageに保存するため、大きな写真を大量に登録すると端末の保存容量を圧迫します。実運用ではSupabase Storage接続を使用してください。
