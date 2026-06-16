-- ============================================================
-- JaeTravel Media Hub — Supabase Schema (v2: + video support)
-- Run this in your Supabase SQL editor (idempotent)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- ALBUMS
-- ─────────────────────────────────────────────
create table if not exists albums (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  description text,
  cover_url   text,
  is_public   boolean not null default false,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- MEDIA (images + videos unified)
-- ─────────────────────────────────────────────
create table if not exists media (
  id            uuid primary key default uuid_generate_v4(),
  album_id      uuid not null references albums(id) on delete cascade,
  media_type    text not null default 'image' check (media_type in ('image', 'video')),
  storage_path  text not null,
  public_url    text not null,
  thumbnail_url text,                          -- video poster / image thumb
  filename      text not null,
  caption       text,
  tags          text[] default '{}',
  width         integer,
  height        integer,
  duration_sec  integer,                       -- video duration in seconds
  size_bytes    bigint,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Keep old "images" name as a view for backward compat with existing API routes
create or replace view images as
  select * from media where media_type = 'image';

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table albums enable row level security;
alter table media  enable row level security;

-- Drop old policies if re-running
drop policy if exists "team_all_albums"          on albums;
drop policy if exists "public_read_public_albums" on albums;
drop policy if exists "team_all_images"           on media;
drop policy if exists "public_read_public_images" on media;
drop policy if exists "team_all_media"            on media;
drop policy if exists "public_read_public_media"  on media;

-- Albums
create policy "team_all_albums" on albums
  for all using (auth.uid() is not null);

create policy "public_read_public_albums" on albums
  for select using (is_public = true);

-- Media
create policy "team_all_media" on media
  for all using (auth.uid() is not null);

create policy "public_read_public_media" on media
  for select using (
    exists (
      select 1 from albums a
      where a.id = media.album_id and a.is_public = true
    )
  );

-- ─────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('media-hub', 'media-hub', true, 524288000)  -- 500 MB limit
on conflict (id) do update set file_size_limit = 524288000;

-- Drop old storage policies if re-running
drop policy if exists "team_upload"  on storage.objects;
drop policy if exists "team_delete"  on storage.objects;
drop policy if exists "public_read"  on storage.objects;

-- FIX: use auth.uid() IS NOT NULL (works with anon key + session)
create policy "team_upload" on storage.objects
  for insert with check (
    bucket_id = 'media-hub' and auth.uid() is not null
  );

create policy "team_delete" on storage.objects
  for delete using (
    bucket_id = 'media-hub' and auth.uid() is not null
  );

create policy "public_read" on storage.objects
  for select using (bucket_id = 'media-hub');

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists albums_updated_at on albums;
create trigger albums_updated_at
  before update on albums
  for each row execute procedure update_updated_at();
