-- 日本全国陣取りゲーム / Supabase MVP schema
-- 1) Supabase SQL Editorでこのファイルを実行
-- 2) Storageに「stay-photos」バケットを作成（Public OFF推奨）
-- 3) config.jsにProject URL / anon keyを設定
--
-- 認証なしのMVPなので、RLSは「ゲーム上必要な最小限」に限定しています。
-- 本番公開前には、管理操作をEdge Function等へ分離することを推奨します。

create extension if not exists pgcrypto;

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  name text not null default '日本全国陣取り',
  start_date date,
  started boolean not null default false,
  is_active boolean not null default true,
  current_period integer not null default 1,
  home_points numeric not null default 5,
  other_points numeric not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  slot integer not null check(slot between 1 and 4),
  name text not null,
  residence_prefecture char(2) not null,
  color text not null check(color in ('red','blue','green','yellow')),
  created_at timestamptz not null default now(),
  unique(game_id,slot),
  unique(game_id,color)
);

create table if not exists residences (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  prefecture_code char(2) not null,
  started_on date not null,
  ended_on date,
  created_at timestamptz not null default now()
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

create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  prefecture_code char(2) not null,
  point_month date not null,
  base_points numeric not null,
  multiplier numeric not null default 1,
  points numeric not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(player_id,prefecture_code,point_month)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  settled_at timestamptz not null default now(),
  snapshot jsonb not null
);

create table if not exists region_completions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  region_name text not null,
  completed_on date not null,
  active boolean not null default true,
  unique(game_id,player_id,region_name,completed_on)
);

create index if not exists stays_game_pref_date_idx on stays(game_id,prefecture_code,stay_date,created_at);
create index if not exists stays_game_player_idx on stays(game_id,player_id,stay_date);
create index if not exists point_transactions_month_idx on point_transactions(game_id,point_month);
create index if not exists residences_game_pref_idx on residences(game_id,prefecture_code,started_on,ended_on);

-- 47都道府県マスタ（ゲームの表示・地方制覇判定用）
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

insert into games(name) select '日本全国陣取り' where not exists(select 1 from games);

-- 所有権ビュー
create or replace view current_prefecture_ownership as
with ranked as (
  select s.*,
    row_number() over(partition by s.game_id,s.prefecture_code order by s.stay_date desc,s.created_at desc) as rn,
    count(*) over(partition by s.game_id,s.prefecture_code,s.stay_date) as same_day_count
  from stays s
)
select r.game_id,r.prefecture_code,
       case when r.same_day_count > 1 then 'blank' else 'owned' end as status,
       case when r.same_day_count > 1 then null else r.player_id end as player_id,
       r.stay_date as latest_stay_date
from ranked r where r.rn=1;

-- 毎月1日に呼ぶ月次ポイント関数。
-- 同日競合、対象外居住県、ゲーム開始前を除外。
create or replace function award_monthly_points(p_game_id uuid, p_point_month date)
returns void
language plpgsql
security definer
as $$
declare
  r record;
  v_home_region text;
  v_base numeric;
  v_multiplier numeric;
  v_points numeric;
begin
  if extract(day from p_point_month) <> 1 then
    raise exception 'point_month must be the first day of a month';
  end if;

  for r in
    select o.prefecture_code,o.player_id,p.region_name
    from current_prefecture_ownership o
    join prefectures p on p.code=o.prefecture_code
    join games g on g.id=o.game_id
    where o.game_id=p_game_id and o.status='owned'
      and g.started=true and g.start_date < p_point_month
      and not exists (
        select 1 from residences rs
        where rs.game_id=p_game_id and rs.prefecture_code=o.prefecture_code
          and rs.started_on <= p_point_month
          and (rs.ended_on is null or rs.ended_on >= p_point_month)
      )
  loop
    select p2.region_name into v_home_region
    from players pl
    join prefectures p2 on p2.code=pl.residence_prefecture
    where pl.id=r.player_id;

    select case when r.region_name=v_home_region then home_points else other_points end
      into v_base from games where id=p_game_id;

    -- 地方制覇の判定。対象外居住県は除外。
    select case when count(*) > 0 and bool_and(co.player_id=r.player_id) then 1.5 else 1 end
      into v_multiplier
    from prefectures p
    left join current_prefecture_ownership co
      on co.game_id=p_game_id and co.prefecture_code=p.code and co.status='owned'
    where p.region_name=r.region_name
      and not exists (
        select 1 from residences rs
        where rs.game_id=p_game_id and rs.prefecture_code=p.code
          and rs.started_on <= p_point_month
          and (rs.ended_on is null or rs.ended_on >= p_point_month)
      );

    v_points:=v_base*v_multiplier;

    insert into point_transactions(game_id,player_id,prefecture_code,point_month,base_points,multiplier,points,reason)
    values(p_game_id,r.player_id,r.prefecture_code,p_point_month,v_base,v_multiplier,v_points,
      case when v_multiplier=1.5 then '月次ポイント（地方制覇1.5倍）' else '月次ポイント' end)
    on conflict(player_id,prefecture_code,point_month) do nothing;
  end loop;
end;
$$;

-- RLS
alter table games enable row level security;
alter table players enable row level security;
alter table residences enable row level security;
alter table stays enable row level security;
alter table point_transactions enable row level security;
alter table settlements enable row level security;
alter table region_completions enable row level security;
alter table prefectures enable row level security;

drop policy if exists games_public_read on games;
create policy games_public_read on games for select using (true);

drop policy if exists players_public_read on players;
create policy players_public_read on players for select using (true);

drop policy if exists prefectures_public_read on prefectures;
create policy prefectures_public_read on prefectures for select using (true);

drop policy if exists stays_public_read on stays;
create policy stays_public_read on stays for select using (true);

drop policy if exists stays_public_insert on stays;
create policy stays_public_insert on stays for insert with check (
  exists(select 1 from games g where g.id=game_id and g.started=true and stay_date>=g.start_date and stay_date<=current_date)
  and exists(select 1 from players p where p.id=player_id and p.game_id=game_id)
  and length(photo_path)>0
);

drop policy if exists residences_public_read on residences;
create policy residences_public_read on residences for select using (true);

drop policy if exists point_transactions_public_read on point_transactions;
create policy point_transactions_public_read on point_transactions for select using (true);

drop policy if exists settlements_public_read on settlements;
create policy settlements_public_read on settlements for select using (true);

drop policy if exists region_completions_public_read on region_completions;
create policy region_completions_public_read on region_completions for select using (true);

-- Storage
-- Dashboardでbucket名「stay-photos」を作成してください。
-- 公開URLを使わず、必要に応じてsigned URLへ切り替えてください。

-- URLを知っている管理者が使うMVPのための限定的な書き込みポリシー。
-- 本番では認証/Edge Function等へ置き換えること。
drop policy if exists games_public_insert on games;
create policy games_public_insert on games for insert with check (is_active=true);
drop policy if exists games_public_update on games;
create policy games_public_update on games for update using (is_active=true) with check (is_active=true);

drop policy if exists players_public_insert on players;
create policy players_public_insert on players for insert with check (
  slot between 1 and 4 and exists(select 1 from games g where g.id=game_id and g.is_active=true)
);
drop policy if exists players_public_update on players;
create policy players_public_update on players for update using (
  exists(select 1 from games g where g.id=game_id and g.is_active=true)
) with check (slot between 1 and 4);

drop policy if exists residences_public_insert on residences;
create policy residences_public_insert on residences for insert with check (
  exists(select 1 from games g where g.id=game_id and g.is_active=true)
  and exists(select 1 from players p where p.id=player_id and p.game_id=game_id)
);

drop policy if exists settlements_public_insert on settlements;
create policy settlements_public_insert on settlements for insert with check (
  exists(select 1 from games g where g.id=game_id and g.is_active=true and g.started=true)
);
