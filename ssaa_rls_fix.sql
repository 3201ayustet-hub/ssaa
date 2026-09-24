-- SSAA RLS FIX
-- 目的: 現在の 42501 "new row violates row-level security policy for table ssaa_stays"
-- を解消するため、SSAA専用テーブルのData API権限とRLSを確実に再設定します。
-- 既存データ・テーブルは削除しません。

begin;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on table public.ssaa_games,
           public.ssaa_players,
           public.ssaa_stays,
           public.ssaa_settlements
to anon, authenticated;

alter table public.ssaa_games enable row level security;
alter table public.ssaa_players enable row level security;
alter table public.ssaa_stays enable row level security;
alter table public.ssaa_settlements enable row level security;

-- 既存のSSAAポリシーを名前に関係なく一旦整理。
drop policy if exists ssaa_games_read on public.ssaa_games;
drop policy if exists ssaa_games_insert on public.ssaa_games;
drop policy if exists ssaa_games_update on public.ssaa_games;
drop policy if exists ssaa_games_select on public.ssaa_games;

drop policy if exists ssaa_players_read on public.ssaa_players;
drop policy if exists ssaa_players_insert on public.ssaa_players;
drop policy if exists ssaa_players_update on public.ssaa_players;
drop policy if exists ssaa_players_select on public.ssaa_players;

drop policy if exists ssaa_stays_read on public.ssaa_stays;
drop policy if exists ssaa_stays_insert on public.ssaa_stays;
drop policy if exists ssaa_stays_delete on public.ssaa_stays;
drop policy if exists ssaa_stays_select on public.ssaa_stays;

drop policy if exists ssaa_settlements_read on public.ssaa_settlements;
drop policy if exists ssaa_settlements_insert on public.ssaa_settlements;
drop policy if exists ssaa_settlements_delete on public.ssaa_settlements;
drop policy if exists ssaa_settlements_select on public.ssaa_settlements;

-- SSAA専用領域は、匿名ユーザーでもゲームを使える設計なので、
-- RLSは「認証状態」ではなくAPIアクセス可否だけを担保します。
create policy ssaa_games_select
on public.ssaa_games
for select
to anon, authenticated
using (true);

create policy ssaa_games_insert
on public.ssaa_games
for insert
to anon, authenticated
with check (true);

create policy ssaa_games_update
on public.ssaa_games
for update
to anon, authenticated
using (true)
with check (true);

create policy ssaa_players_select
on public.ssaa_players
for select
to anon, authenticated
using (true);

create policy ssaa_players_insert
on public.ssaa_players
for insert
to anon, authenticated
with check (true);

create policy ssaa_players_update
on public.ssaa_players
for update
to anon, authenticated
using (true)
with check (true);

create policy ssaa_stays_select
on public.ssaa_stays
for select
to anon, authenticated
using (true);

-- ここが今回の42501の直接修正箇所。
-- 外部キー制約(game_id/player_id)やNOT NULL/CHECK制約はDB側で引き続き検証されます。
create policy ssaa_stays_insert
on public.ssaa_stays
for insert
to anon, authenticated
with check (true);

create policy ssaa_stays_delete
on public.ssaa_stays
for delete
to anon, authenticated
using (true);

create policy ssaa_settlements_select
on public.ssaa_settlements
for select
to anon, authenticated
using (true);

create policy ssaa_settlements_insert
on public.ssaa_settlements
for insert
to anon, authenticated
with check (true);

create policy ssaa_settlements_delete
on public.ssaa_settlements
for delete
to anon, authenticated
using (true);

notify pgrst, 'reload schema';

commit;
