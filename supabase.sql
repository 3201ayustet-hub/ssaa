-- デジ太郎電鉄 / Supabase共有データ用
-- Supabase SQL Editorでこのファイルを最初に1回実行してください。
-- 既存版のDBがある場合も、下記のALTER/POLICY部分で今回の仕様へ寄せます。
-- ブラウザにはPublishable Keyのみを使用し、Secret Keyは使用しません。

create extension if not exists pgcrypto;

create table if not exists games (
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

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  slot integer not null check(slot between 1 and 4),
  name text not null,
  residence_prefecture char(2),
  color text not null check(color in ('red','blue','green','yellow')),
  created_at timestamptz not null default now(),
  unique(game_id,slot),
  unique(game_id,color)
);

create table if not exists stays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  prefecture_code char(2) not null,
  stay_date date not null,
  stay_type text not null check(stay_type in ('食事','観光','宿泊','旅行','その他')),
  photo_path text not null,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  settled_at timestamptz not null default now(),
  snapshot jsonb not null
);

create table if not exists prefectures (
  code char(2) primary key,
  name text not null,
  region_name text not null
);

insert into prefectures(code,name,region_name) values
('01','北海道','北海道'),('02','青森県','東北'),('03','岩手県','東北'),('04','宮城県','東北'),('05','秋田県','東北'),('06','山形県','東北'),('07','福島県','東北'),
('08','茨城県','関東'),('09','栃木県','関東'),('10','群馬県','関東'),('11','埼玉県','関東'),('12','千葉県','関東'),('13','東京都','関東'),('14','神奈川県','関東'),
('15','新潟県','中部'),('16','富山県','中部'),('17','石川県','中部'),('18','福井県','中部'),('19','山梨県','中部'),('20','長野県','中部'),('21','岐阜県','中部'),('22','静岡県','中部'),('23','愛知県','中部'),
('24','三重県','近畿'),('25','滋賀県','近畿'),('26','京都府','近畿'),('27','大阪府','近畿'),('28','兵庫県','近畿'),('29','奈良県','近畿'),('30','和歌山県','近畿'),
('31','鳥取県','中国'),('32','島根県','中国'),('33','岡山県','中国'),('34','広島県','中国'),('35','山口県','中国'),
('36','徳島県','四国'),('37','香川県','四国'),('38','愛媛県','四国'),('39','高知県','四国'),
('40','福岡県','九州・沖縄'),('41','佐賀県','九州・沖縄'),('42','長崎県','九州・沖縄'),('43','熊本県','九州・沖縄'),('44','大分県','九州・沖縄'),('45','宮崎県','九州・沖縄'),('46','鹿児島県','九州・沖縄'),('47','沖縄県','九州・沖縄')
on conflict(code) do update set name=excluded.name,region_name=excluded.region_name;

insert into games(name) select 'デジ太郎電鉄' where not exists(select 1 from games);

alter table players alter column residence_prefecture drop not null;
alter table games add column if not exists season_start_date date not null default current_date;

alter table games enable row level security;
alter table players enable row level security;
alter table stays enable row level security;
alter table settlements enable row level security;
alter table prefectures enable row level security;

drop policy if exists games_public_read on games;
create policy games_public_read on games for select using (true);
drop policy if exists games_public_insert on games;
create policy games_public_insert on games for insert with check (is_active=true);
drop policy if exists games_public_update on games;
create policy games_public_update on games for update using (is_active=true) with check (is_active=true);

drop policy if exists players_public_read on players;
create policy players_public_read on players for select using (true);
drop policy if exists players_public_insert on players;
create policy players_public_insert on players for insert with check (
  slot between 1 and 4 and exists(select 1 from games g where g.id=game_id and g.is_active=true)
);
drop policy if exists players_public_update on players;
create policy players_public_update on players for update using (
  exists(select 1 from games g where g.id=game_id and g.is_active=true)
) with check (slot between 1 and 4);

drop policy if exists stays_public_read on stays;
create policy stays_public_read on stays for select using (true);
drop policy if exists stays_public_insert on stays;
create policy stays_public_insert on stays for insert with check (
  stay_date <= current_date
  and exists(select 1 from games g where g.id=game_id and g.is_active=true)
  and exists(select 1 from players p where p.id=player_id and p.game_id=game_id)
  and length(photo_path)>0
);
drop policy if exists stays_public_delete on stays;
create policy stays_public_delete on stays for delete using (
  exists(select 1 from games g where g.id=game_id and g.is_active=true)
);

drop policy if exists settlements_public_read on settlements;
create policy settlements_public_read on settlements for select using (true);
drop policy if exists settlements_public_insert on settlements;
create policy settlements_public_insert on settlements for insert with check (
  exists(select 1 from games g where g.id=game_id and g.is_active=true)
);
drop policy if exists settlements_public_delete on settlements;
create policy settlements_public_delete on settlements for delete using (
  exists(select 1 from games g where g.id=game_id and g.is_active=true)
);

drop policy if exists prefectures_public_read on prefectures;
create policy prefectures_public_read on prefectures for select using (true);

-- Realtimeを使える環境なら後から有効化できます。
-- 今回の実装は5秒ポーリング＋画面復帰時同期で4端末の共有状態を維持します。

-- 既存DBの「ゲーム開始が必要」条件を撤廃するため、
-- stays_public_insertではgames.startedを参照していません。
