# JaeTravel Media Hub

Internal image & video library with public gallery sharing for JaeTravel Expeditions.

---

## Stack

- **Next.js 14** (App Router)
- **Supabase** — auth, database (Postgres), file storage
- **NVIDIA NIM API** — AI captions via `meta/llama-3.2-90b-vision-instruct` (vision model)
- **Tailwind CSS** — JaeTravel gold-and-black theme

---

## Setup

### 1. Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/schema.sql`
3. Add team members in **Authentication → Users → Add user**

### 2. NVIDIA API key

1. Sign up at [build.nvidia.com](https://build.nvidia.com)
2. Go to **API Keys** → create a key
3. The app uses `meta/llama-3.2-90b-vision-instruct` — a multimodal vision model that describes safari images

### 3. Environment variables

Copy `.env.local.example` → `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NVIDIA_API_KEY=nvapi-your-key-here
NEXT_PUBLIC_APP_URL=https://media.jaetravel.co.ke
```

### 4. Run

```bash
npm install
npm run dev
```

---

## Features

### Images & Videos
- Upload photos (JPG, PNG, WEBP) and videos (MP4, MOV, WEBM)
- Drag-and-drop or browse — up to 20 files at once
- Videos preview on hover in the grid; full player in lightbox
- AI captions generated automatically for images via NVIDIA vision model

### Albums
- Create albums with a name, description, and public/private toggle
- Each album has a unique slug (URL-safe name)

### Share links
When an album is made **Public**, a secret share link is generated:
```
https://media.jaetravel.co.ke/gallery/<share_token>
```
- Anyone with the link can view all photos and videos — no login needed
- They cannot upload, delete, or modify anything

### Public API (embed on jaetravel.co.ke)

**All public albums:**
```
GET /api/albums
```

**All media in an album:**
```
GET /api/albums/masai-mara/images
GET /api/albums/masai-mara/images?limit=12&offset=0&type=image
GET /api/albums/masai-mara/images?type=video
```

Response includes both `media` (all) and `images` (photos only, for backward compat):
```json
{
  "album": { "name": "Masai Mara", "slug": "masai-mara" },
  "media": [
    {
      "id": "uuid",
      "media_type": "image",
      "public_url": "https://....supabase.co/storage/...",
      "filename": "lion.jpg",
      "caption": "A lion rests in the golden grass...",
      "tags": ["lion", "wildlife", "Masai Mara"],
      "duration_sec": null,
      "created_at": "2026-06-16T..."
    },
    {
      "id": "uuid",
      "media_type": "video",
      "public_url": "https://....supabase.co/storage/...",
      "filename": "elephant-crossing.mp4",
      "caption": "A safari video captured by JaeTravel...",
      "duration_sec": 45,
      "created_at": "2026-06-16T..."
    }
  ],
  "images": [ ... ], // photos only
  "total": 24
}
```

### Embedding on jaetravel.co.ke

```tsx
// components/SafariGallery.tsx
"use client";
import { useEffect, useState } from "react";

const MEDIA_HUB = "https://media.jaetravel.co.ke";

interface MediaItem {
  id: string;
  media_type: "image" | "video";
  public_url: string;
  caption: string | null;
  tags: string[];
}

export function SafariGallery({ slug, type }: { slug: string; type?: "image" | "video" }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `${MEDIA_HUB}/api/albums/${slug}/images?limit=12${type ? `&type=${type}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.media ?? []);
        setLoading(false);
      });
  }, [slug, type]);

  if (loading) return <div className="text-center py-8 text-gray-400">Loading…</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.id} className="group relative overflow-hidden rounded-lg aspect-square bg-gray-900">
          {item.media_type === "video" ? (
            <video
              src={item.public_url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={item.public_url}
              alt={item.caption ?? "JaeTravel photo"}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          )}
          {item.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs line-clamp-2">{item.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Usage:
// <SafariGallery slug="masai-mara" />               // all media
// <SafariGallery slug="masai-mara" type="image" />  // photos only
// <SafariGallery slug="masai-mara" type="video" />  // videos only
```

---

## Fixes in v2

| Issue | Fix |
|---|---|
| Login fails despite correct credentials | After `signInWithPassword`, explicitly call `setSession()` then use `window.location.href` for hard navigation — ensures cookies are committed before redirect |
| Upload fails (storage permission denied) | Changed RLS from `auth.role() = 'authenticated'` → `auth.uid() IS NOT NULL` — the former doesn't work with the browser anon key + session |
| AI captions — Anthropic | Replaced with NVIDIA NIM API using `meta/llama-3.2-90b-vision-instruct` |
| No video support | Added `media` table (replaces `images`), video upload/preview/lightbox, public API `?type=` filter |

---

## Database schema

```
albums    — id, name, slug, description, cover_url, is_public, share_token
media     — id, album_id, media_type (image|video), storage_path, public_url,
            thumbnail_url, filename, caption, tags, width, height,
            duration_sec, size_bytes, uploaded_by
```

The old `images` table is available as a view on `media where media_type = 'image'`.

---

## CORS

API routes allow `https://jaetravel.co.ke`. To add more origins, update:
- `app/api/albums/route.ts`
- `app/api/albums/[slug]/images/route.ts`
