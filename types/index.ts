export type MediaType = "image" | "video";

export interface Album {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
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
