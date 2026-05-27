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

CREATE INDEX IF NOT EXISTS photo_assets_photo_id_idx
  ON photo_assets (photo_id, sort_order ASC);

CREATE UNIQUE INDEX IF NOT EXISTS photo_assets_one_primary_per_photo_idx
  ON photo_assets (photo_id)
  WHERE is_primary = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS photo_assets_photo_original_key_idx
  ON photo_assets (photo_id, storage_key_original);

INSERT INTO photo_assets (
  id,
  photo_id,
  storage_key_original,
  storage_key_large,
  storage_key_medium,
  storage_key_thumbnail,
  storage_key_blur,
  width,
  height,
  file_size,
  mime_type,
  sort_order,
  is_primary
)
SELECT
  photos.id || '-primary',
  photos.id,
  photos.storage_key_original,
  photos.storage_key_large,
  photos.storage_key_medium,
  photos.storage_key_thumbnail,
  photos.storage_key_blur,
  photos.width,
  photos.height,
  photos.file_size,
  photos.mime_type,
  0,
  TRUE
FROM photos
WHERE photos.status <> 'deleted'
  AND NOT EXISTS (
    SELECT 1
    FROM photo_assets
    WHERE photo_assets.photo_id = photos.id
  );
