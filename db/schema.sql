CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  visibility TEXT NOT NULL DEFAULT 'private',
  storage_key_original TEXT NOT NULL,
  storage_key_large TEXT,
  storage_key_medium TEXT,
  storage_key_thumbnail TEXT,
  storage_key_blur TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  camera_model TEXT,
  lens_model TEXT,
  focal_length TEXT,
  iso INTEGER,
  aperture TEXT,
  shutter_speed TEXT,
  taken_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  show_location BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT photos_status_check CHECK (
    status IN ('pending', 'uploading', 'processing', 'ready', 'failed', 'deleted')
  ),
  CONSTRAINT photos_visibility_check CHECK (
    visibility IN ('private', 'public', 'unlisted', 'draft')
  )
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photo_tags (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);

CREATE TABLE IF NOT EXISTS photo_assets (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  storage_key_original TEXT NOT NULL,
  storage_key_large TEXT,
  storage_key_medium TEXT,
  storage_key_thumbnail TEXT,
  storage_key_blur TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  cover_photo_id TEXT REFERENCES photos(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT collections_visibility_check CHECK (
    visibility IN ('private', 'public', 'unlisted', 'draft')
  )
);

CREATE TABLE IF NOT EXISTS collection_photos (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, photo_id)
);

CREATE INDEX IF NOT EXISTS photos_public_list_idx
  ON photos (uploaded_at DESC, id DESC)
  WHERE visibility = 'public' AND status <> 'deleted';

CREATE INDEX IF NOT EXISTS photo_assets_photo_id_idx
  ON photo_assets (photo_id, sort_order ASC);

CREATE UNIQUE INDEX IF NOT EXISTS photo_assets_one_primary_per_photo_idx
  ON photo_assets (photo_id)
  WHERE is_primary = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS photo_assets_photo_original_key_idx
  ON photo_assets (photo_id, storage_key_original);

CREATE INDEX IF NOT EXISTS photo_tags_tag_id_idx ON photo_tags (tag_id);
CREATE INDEX IF NOT EXISTS collection_photos_photo_id_idx ON collection_photos (photo_id);
