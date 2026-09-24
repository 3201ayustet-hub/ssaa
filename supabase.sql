-- デジ太郎電鉄 / SSAA専用DB
-- 既存の games / players / stays / settlements テーブルは変更しません。
-- このSQLはSSAA専用の ssaa_* テーブルだけを作成します。

create extension if not exists pgcrypto;

create table if not exists public.ssaa_games (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'デジ太郎電鉄',
  start_date date,
  started boolean not null default false,
  is_active boolean not null default true,
  current_period integer not null default 1,
  home_points numeric not null default 5,
  other_points numeric not null default 10,
  season_start_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.ssaa_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.ssaa_games(id) on delete cascade,
  slot integer not null check(slot between 1 and 4),
  name text not null,
  residence_prefecture char(2),
  color text not null check(color in ('red','blue','green','yellow')),
  created_at timestamptz not null default now(),
  unique(game_id,slot),
  unique(game_id,color)
);

create table if not exists public.ssaa_stays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.ssaa_games(id) on delete cascade,
  player_id uuid not null references public.ssaa_players(id) on delete restrict,
  prefecture_code char(2) not null,
  stay_date date not null,
  stay_type text not null check(stay_type in ('食事','観光','宿泊','旅行','その他')),
  photo_path text not null,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.ssaa_settlements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.ssaa_games(id) on delete cascade,
  settled_at timestamptz not null default now(),
  snapshot jsonb not null
);

-- アプリ側は新規行のidを null で送る実装なので、DB側でUUIDを補完する。
create or replace function public.ssaa_set_uuid_when_null()
returns trigger
language plpgsql
as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  return new;
end;
$$;

drop trigger if exists ssaa_games_set_uuid on public.ssaa_games;
create trigger ssaa_games_set_uuid
before insert on public.ssaa_games
for each row execute function public.ssaa_set_uuid_when_null();

drop trigger if exists ssaa_players_set_uuid on public.ssaa_players;
create trigger ssaa_players_set_uuid
before insert on public.ssaa_players
for each row execute function public.ssaa_set_uuid_when_null();

drop trigger if exists ssaa_stays_set_uuid on public.ssaa_stays;
create trigger ssaa_stays_set_uuid
before insert on public.ssaa_stays
for each row execute function public.ssaa_set_uuid_when_null();

drop trigger if exists ssaa_settlements_set_uuid on public.ssaa_settlements;
create trigger ssaa_settlements_set_uuid
before insert on public.ssaa_settlements
for each row execute function public.ssaa_set_uuid_when_null();

-- 初期ゲームは、まだ無ければ1件だけ作る。
insert into public.ssaa_games(name)
select 'デジ太郎電鉄'
where not exists (select 1 from public.ssaa_games);

-- Data APIからのアクセス権
revoke all on table public.ssaa_games, public.ssaa_players, public.ssaa_stays, public.ssaa_settlements from anon, authenticated;
grant select, insert, update, delete on table public.ssaa_games, public.ssaa_players, public.ssaa_stays, public.ssaa_settlements to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.ssaa_games enable row level security;
alter table public.ssaa_players enable row level security;
alter table public.ssaa_stays enable row level security;
alter table public.ssaa_settlements enable row level security;

drop policy if exists ssaa_games_read on public.ssaa_games;
create policy ssaa_games_read on public.ssaa_games for select to anon, authenticated using (true);
drop policy if exists ssaa_games_insert on public.ssaa_games;
create policy ssaa_games_insert on public.ssaa_games for insert to anon, authenticated with check (is_active = true);
drop policy if exists ssaa_games_update on public.ssaa_games;
create policy ssaa_games_update on public.ssaa_games for update to anon, authenticated using (is_active = true) with check (is_active = true);

drop policy if exists ssaa_players_read on public.ssaa_players;
create policy ssaa_players_read on public.ssaa_players for select to anon, authenticated using (true);
drop policy if exists ssaa_players_insert on public.ssaa_players;
create policy ssaa_players_insert on public.ssaa_players for insert to anon, authenticated with check (
  slot between 1 and 4
  and exists (select 1 from public.ssaa_games g where g.id = game_id and g.is_active = true)
);
drop policy if exists ssaa_players_update on public.ssaa_players;
create policy ssaa_players_update on public.ssaa_players for update to anon, authenticated using (
  exists (select 1 from public.ssaa_games g where g.id = game_id and g.is_active = true)
) with check (slot between 1 and 4);

drop policy if exists ssaa_stays_read on public.ssaa_stays;
create policy ssaa_stays_read on public.ssaa_stays for select to anon, authenticated using (true);
drop policy if exists ssaa_stays_insert on public.ssaa_stays;
create policy ssaa_stays_insert on public.ssaa_stays for insert to anon, authenticated with check (
  stay_date <= current_date
  and exists (select 1 from public.ssaa_games g where g.id = game_id and g.is_active = true)
  and exists (select 1 from public.ssaa_players p where p.id = player_id and p.game_id = game_id)
  and length(photo_path) > 0
);
drop policy if exists ssaa_stays_delete on public.ssaa_stays;
create policy ssaa_stays_delete on public.ssaa_stays for delete to anon, authenticated using (
  exists (select 1 from public.ssaa_games g where g.id = game_id and g.is_active = true)
);

drop policy if exists ssaa_settlements_read on public.ssaa_settlements;
create policy ssaa_settlements_read on public.ssaa_settlements for select to anon, authenticated using (true);
drop policy if exists ssaa_settlements_insert on public.ssaa_settlements;
create policy ssaa_settlements_insert on public.ssaa_settlements for insert to anon, authenticated with check (
  exists (select 1 from public.ssaa_games g where g.id = game_id and g.is_active = true)
);
drop policy if exists ssaa_settlements_delete on public.ssaa_settlements;
create policy ssaa_settlements_delete on public.ssaa_settlements for delete to anon, authenticated using (
  exists (select 1 from public.ssaa_games g where g.id = game_id and g.is_active = true)
);

-- 確認用（実行後に4テーブルが表示されればOK）
select table_name
from information_schema.tables
where table_schema='public'
  and table_name like 'ssaa_%'
order by table_name;
