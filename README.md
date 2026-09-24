# デジ太郎電鉄 Supabase版

## 配置
GitHubへ以下のファイルを配置してください。

- index.html
- app.js
- styles.css
- config.js
- supabase.sql
- icon.svg

## 最初に1回だけ
SupabaseのSQL Editorで `supabase.sql` を全文実行してください。

## この版で直した点
- 4人が同じSupabaseデータを共有
- ゲーム開始ボタン・開始状態を不要化
- 滞在登録のinsert条件から「ゲーム開始済み」を撤去
- 滞在登録の写真はiPhoneの写真ライブラリから選択
- 写真は圧縮したdata URLをSupabaseに保存（Storage設定不要）
- 地図の北海道上などに出ていた都道府県外の装飾線をDOMから除去
- 地方機能は残すが、トップ地図上に地方境界線は描画しない
- プレイヤー選択はP1/P2ではなく「赤・青・緑・黄」
- メニューに現在のルールを表示
- ゲーム終了で滞在・所有情報を残し、次シーズンへ移行
- テストデータ全削除をSupabase上で実行
- プレイヤー情報を変更可能
- 5秒ごとの同期＋アプリ復帰時同期

## 注意
Publishable Keyはクライアント公開前提ですが、Secret Keyは絶対に入れていません。
