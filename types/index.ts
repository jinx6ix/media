export type MediaType = "image" | "video";

export interface Album {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  share_token: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  image_count?: number;
}

export interface Media {
  id: string;
  album_id: string;
  media_type: MediaType;
  storage_path: string;
  public_url: string;
  thumbnail_url: string | null;
  filename: string;
  caption: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  size_bytes: number | null;
  shot_lat: number | null;
  shot_lng: number | null;
  shot_place_name: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// backward compat alias
export type Image = Media;

export interface UploadResult {
  success: boolean;
  media?: Media;
  error?: string;
}

// Public API response types (for embedding on jaetravel.co.ke)
export interface PublicAlbum {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  image_count: number;
  created_at: string;
}

export interface PublicMedia {
  id: string;
  media_type: MediaType;
  public_url: string;
  thumbnail_url: string | null;
  filename: string;
  caption: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
  duration_sec: number | null;
  created_at: string;
}

// keep old name for API compat
export type PublicImage = PublicMedia;

// ─────────────────────────────────────────────
// DESTINATIONS
// ─────────────────────────────────────────────

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  description: string | null;
  cover_url: string | null;
  share_token: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubLocation {
  id: string;
  destination_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Accommodation {
  id: string;
  sub_location_id: string;
  name: string;
  type: 'lodge' | 'camp' | 'hotel' | 'tented_camp' | 'bandas' | 'homestay' | 'other';
  description: string | null;
  cover_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaCategory {
  id: string;
  sub_location_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  created_by: string | null;
  created_at: string;
}

export interface DestinationMedia {
  id: string;
  category_id: string;
  sub_location_id: string;
  destination_id: string;
  media_type: MediaType;
  storage_path: string;
  public_url: string;
  filename: string;
  caption: string | null;
  description: string | null;
  tags: string[];
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export const ACCOMMODATION_TYPES = [
  { value: 'lodge',        label: 'Lodge' },
  { value: 'camp',         label: 'Camp' },
  { value: 'hotel',        label: 'Hotel' },
  { value: 'tented_camp',  label: 'Tented Camp' },
  { value: 'bandas',       label: 'Bandas' },
  { value: 'homestay',     label: 'Homestay' },
  { value: 'other',        label: 'Other' },
] as const;

export const DEFAULT_MEDIA_CATEGORIES = [
  { name: 'Birds',      slug: 'birds',      icon: '🦅' },
  { name: 'Wildlife',   slug: 'wildlife',   icon: '🦁' },
  { name: 'Landscapes', slug: 'landscapes', icon: '🌄' },
  { name: 'People',     slug: 'people',     icon: '👥' },
  { name: 'Flora',      slug: 'flora',      icon: '🌿' },
  { name: 'Sunsets',    slug: 'sunsets',    icon: '🌅' },
] as const;

// v3 additions
export interface SubLocationCoords {
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  place_name: string | null;
}

export interface MediaShotLocation {
  shot_lat: number | null;
  shot_lng: number | null;
  shot_place_id: string | null;
  shot_place_name: string | null;
}

// Updated DestinationMedia — no single category_id; uses junction table
export interface DestinationMediaV3 extends Omit<DestinationMedia, 'category_id'>, MediaShotLocation {
  categories?: MediaCategory[];   // populated via join
}

export interface MediaCategoryLink {
  media_id: string;
  category_id: string;
}
