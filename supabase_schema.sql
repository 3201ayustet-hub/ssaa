create extension if not exists pgcrypto;

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'setup' check (status in ('setup','active')),
  started_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists regions (
  id text primary key,
  name text not null,
  display_order integer not null
);

create table if not exists prefectures (
  id text primary key,
  code text not null unique,
  name text not null,
  region_id text not null references regions(id),
  display_order integer not null,
  svg_id text not null unique
);

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  color text not null,
  created_at timestamptz not null default now(),
  unique(game_id, player_id),
  unique(game_id, color)
);

create table if not exists residences (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  prefecture_id text not null references prefectures(id),
  started_at date not null,
  ended_at date,
  created_at timestamptz not null default now()
);

create table if not exists stays (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  prefecture_id text not null references prefectures(id),
  stay_date date not null,
  stay_type text not null,
  photo_path text not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists stays_lookup_idx
  on stays(game_id, prefecture_id, stay_date desc);

create table if not exists game_settings (
  game_id uuid primary key references games(id) on delete cascade,
  home_region_point integer not null default 5,
  other_region_point integer not null default 10,
  completion_multiplier numeric(4,2) not null default 1.50
);

create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  prefecture_id text references prefectures(id),
  region_id text references regions(id),
  period_start date not null,
  points integer not null,
  point_type text not null default 'monthly',
  created_at timestamptz not null default now(),
  unique(game_id, player_id, prefecture_id, period_start, point_type)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists settlement_results (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references settlements(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  period_points integer not null,
  cumulative_points integer not null,
  rank integer,
  unique(settlement_id, player_id)
);

create index if not exists residences_current_idx
  on residences(game_id, player_id, ended_at);

-- RLS should be enabled and policies should be added after the deployment
-- access model is selected. Do not expose the service-role key to clients.
