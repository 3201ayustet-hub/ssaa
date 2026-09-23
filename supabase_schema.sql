create extension if not exists pgcrypto;
create table if not exists games(id uuid primary key default gen_random_uuid(),name text not null,status text not null default 'setup',created_at timestamptz not null default now());
create table if not exists players(id uuid primary key default gen_random_uuid(),name text not null,color text not null,created_at timestamptz not null default now());
create table if not exists prefectures(id text primary key,name text not null,region text not null);
create table if not exists stays(id uuid primary key default gen_random_uuid(),game_id uuid references games(id) on delete cascade,player_id uuid references players(id) on delete cascade,prefecture_id text references prefectures(id),stay_date date not null,created_at timestamptz not null default now());
create index if not exists stays_lookup on stays(game_id,prefecture_id,stay_date desc);
-- RLS/policiesは公開範囲を決めてから追加してください。service_role keyはクライアントへ公開しないでください。