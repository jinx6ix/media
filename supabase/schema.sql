-- ============================================================
-- JaeTravel Media Hub — Supabase Schema (v2: + video support)
-- Safe to re-run. Handles existing images table.
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
-- MEDIA TABLE
-- Drop old "images" table (or view) first, then create media
-- ─────────────────────────────────────────────-----

-- Drop old images table if it exists as a real table
drop table if exists images cascade;

-- Drop old images view if it exists
drop view if exists images cascade;

-- Create the unified media table
create table if not exists media (
  id            uuid primary key default uuid_generate_v4(),
  album_id      uuid not null references albums(id) on delete cascade,
  media_type    text not null default 'image' check (media_type in ('image', 'video')),
  storage_path  text not null,
  public_url    text not null,
  thumbnail_url text,
  filename      text not null,
  caption       text,
  tags          text[] default '{}',
  width         integer,
  height        integer,
  duration_sec  integer,
  size_bytes    bigint,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Backward-compat view (safe now that the real table is gone)
create or replace view images as
  select * from media where media_type = 'image';

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table albums enable row level security;
alter table media  enable row level security;

drop policy if exists "team_all_albums"           on albums;
drop policy if exists "public_read_public_albums"  on albums;
drop policy if exists "team_all_images"            on media;
drop policy if exists "public_read_public_images"  on media;
drop policy if exists "team_all_media"             on media;
drop policy if exists "public_read_public_media"   on media;

create policy "team_all_albums" on albums
  for all using (auth.uid() is not null);

create policy "public_read_public_albums" on albums
  for select using (is_public = true);

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
values ('media-hub', 'media-hub', true, 524288000)
on conflict (id) do update set file_size_limit = 524288000;

drop policy if exists "team_upload"  on storage.objects;
drop policy if exists "team_delete"  on storage.objects;
drop policy if exists "public_read"  on storage.objects;

-- FIX: auth.uid() IS NOT NULL works correctly with browser sessions
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


-- ============================================================
-- DESTINATIONS MODULE (appended to existing schema)
-- ============================================================

-- ─────────────────────────────────────────────
-- DESTINATIONS  (top-level, e.g. "Masai Mara")
-- ─────────────────────────────────────────────
create table if not exists destinations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  slug         text not null unique,
  country      text not null default 'Kenya',
  description  text,
  cover_url    text,
  is_public    boolean not null default false,
  share_token  text unique default encode(gen_random_bytes(16), 'hex'),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SUB-LOCATIONS  (e.g. "Mara Triangle")
-- ─────────────────────────────────────────────
create table if not exists sub_locations (
  id             uuid primary key default uuid_generate_v4(),
  destination_id uuid not null references destinations(id) on delete cascade,
  name           text not null,
  slug           text not null,
  description    text,
  cover_url      text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(destination_id, slug)
);

-- ─────────────────────────────────────────────
-- ACCOMMODATIONS  (belongs to a sub-location)
-- ─────────────────────────────────────────────
create table if not exists accommodations (
  id              uuid primary key default uuid_generate_v4(),
  sub_location_id uuid not null references sub_locations(id) on delete cascade,
  name            text not null,
  type            text not null default 'lodge'
                  check (type in ('lodge','camp','hotel','tented_camp','bandas','homestay','other')),
  description     text,
  cover_url       text,
  website_url     text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- MEDIA CATEGORIES  (e.g. "Birds", "Wildlife")
-- Scoped to a sub-location
-- ─────────────────────────────────────────────
create table if not exists media_categories (
  id              uuid primary key default uuid_generate_v4(),
  sub_location_id uuid not null references sub_locations(id) on delete cascade,
  name            text not null,
  slug            text not null,
  description     text,
  icon            text default '📷',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique(sub_location_id, slug)
);

-- ─────────────────────────────────────────────
-- DESTINATION MEDIA  (images/videos per category)
-- ─────────────────────────────────────────────
create table if not exists destination_media (
  id              uuid primary key default uuid_generate_v4(),
  category_id     uuid not null references media_categories(id) on delete cascade,
  sub_location_id uuid not null references sub_locations(id) on delete cascade,
  destination_id  uuid not null references destinations(id) on delete cascade,
  media_type      text not null default 'image' check (media_type in ('image','video')),
  storage_path    text not null,
  public_url      text not null,
  filename        text not null,
  caption         text,
  description     text,            -- longer description (unlike short caption)
  tags            text[] default '{}',
  size_bytes      bigint,
  uploaded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RLS for destination tables
-- ─────────────────────────────────────────────
alter table destinations      enable row level security;
alter table sub_locations     enable row level security;
alter table accommodations    enable row level security;
alter table media_categories  enable row level security;
alter table destination_media enable row level security;

-- Team: full access
create policy "team_destinations"      on destinations      for all using (auth.uid() is not null);
create policy "team_sub_locations"     on sub_locations     for all using (auth.uid() is not null);
create policy "team_accommodations"    on accommodations    for all using (auth.uid() is not null);
create policy "team_media_categories"  on media_categories  for all using (auth.uid() is not null);
create policy "team_destination_media" on destination_media for all using (auth.uid() is not null);

-- Public: read only when destination is_public
create policy "public_destinations" on destinations
  for select using (is_public = true);

create policy "public_sub_locations" on sub_locations
  for select using (
    exists (select 1 from destinations d where d.id = sub_locations.destination_id and d.is_public = true)
  );

create policy "public_accommodations" on accommodations
  for select using (
    exists (
      select 1 from sub_locations sl
      join destinations d on d.id = sl.destination_id
      where sl.id = accommodations.sub_location_id and d.is_public = true
    )
  );

create policy "public_media_categories" on media_categories
  for select using (
    exists (
      select 1 from sub_locations sl
      join destinations d on d.id = sl.destination_id
      where sl.id = media_categories.sub_location_id and d.is_public = true
    )
  );

create policy "public_destination_media" on destination_media
  for select using (
    exists (select 1 from destinations d where d.id = destination_media.destination_id and d.is_public = true)
  );

-- Storage: destination media uses same media-hub bucket
-- (existing policies already cover it)

-- Updated-at triggers
drop trigger if exists destinations_updated_at   on destinations;
drop trigger if exists sub_locations_updated_at  on sub_locations;
drop trigger if exists accommodations_updated_at on accommodations;

create trigger destinations_updated_at   before update on destinations   for each row execute procedure update_updated_at();
create trigger sub_locations_updated_at  before update on sub_locations  for each row execute procedure update_updated_at();
create trigger accommodations_updated_at before update on accommodations for each row execute procedure update_updated_at();


-- ============================================================
-- SCHEMA v3: location coordinates + multi-category media
-- ============================================================

-- 1. Add lat/lng + place metadata to sub_locations
alter table sub_locations
  add column if not exists lat          double precision,
  add column if not exists lng          double precision,
  add column if not exists place_id     text,        -- Google Place ID
  add column if not exists place_name   text;        -- canonical Google place name

-- 2. Add lat/lng + "shot at" metadata to destination_media
--    (a photo may be taken at a specific spot inside the sub-location)
alter table destination_media
  add column if not exists shot_lat       double precision,
  add column if not exists shot_lng       double precision,
  add column if not exists shot_place_id  text,
  add column if not exists shot_place_name text;

-- 3. Drop the single category_id FK on destination_media
--    (we replace it with a junction table for many-to-many)
alter table destination_media
  drop column if exists category_id;

-- 4. Junction table: media ↔ categories (many-to-many)
create table if not exists media_category_links (
  media_id    uuid not null references destination_media(id) on delete cascade,
  category_id uuid not null references media_categories(id) on delete cascade,
  primary key (media_id, category_id)
);

alter table media_category_links enable row level security;

create policy "team_media_category_links" on media_category_links
  for all using (auth.uid() is not null);

create policy "public_media_category_links" on media_category_links
  for select using (
    exists (
      select 1 from destination_media dm
      join destinations d on d.id = dm.destination_id
      where dm.id = media_category_links.media_id and d.is_public = true
    )
  );
