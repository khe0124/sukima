# AGENTS.md

## Project Overview

This project is a personal photo archive website for photos taken by the site owner.

The core architecture is:

- Frontend: Next.js
- API: Next.js Route Handlers or a dedicated Node.js backend
- Image storage: Cloudflare R2
- Database: PostgreSQL-compatible DB, such as Supabase Postgres or Neon
- Public image delivery: Cloudflare CDN / public R2 bucket or public path
- Original image protection: private R2 bucket/path with signed GET URLs

The site should archive, browse, tag, search, and display photographs.  
The project should prioritize long-term maintainability, low operating cost, privacy, and clean metadata management.

---

## Core Principle

Do not store image binary data in the database.

Use this separation:

```txt
Database:
- photo metadata
- storage keys
- tags
- collections
- visibility
- EXIF-derived metadata

Object Storage:
- original image files
- generated large images
- generated medium images
- generated thumbnails
```

The database should only store references to image objects, not the files themselves.

---

## Target Architecture

```txt
User Browser
  ↓
Next.js Frontend

Next.js API
  ├─ Generates presigned upload URLs
  ├─ Saves photo metadata
  ├─ Reads photo lists/details
  ├─ Generates signed download URLs for private originals
  └─ Manages tags and collections

Cloudflare R2
  ├─ private/originals
  └─ public/processed

Database
  ├─ photos
  ├─ tags
  ├─ photo_tags
  ├─ collections
  └─ collection_photos
```

---

## Image Storage Strategy

Use Cloudflare R2.

### Private originals

Original uploaded files must be private.

Example key:

```txt
private/originals/2026/05/18/{photoId}-original.jpg
```

Originals are used for:

* long-term archive
* admin-only download
* future reprocessing
* backup-quality preservation

Never expose original image URLs directly to the public.

---

### Public processed images

Generated web images may be public.

Example keys:

```txt
public/photos/2026/05/18/{photoId}-large.webp
public/photos/2026/05/18/{photoId}-medium.webp
public/photos/2026/05/18/{photoId}-thumb.webp
public/photos/2026/05/18/{photoId}-blur.webp
```

Recommended sizes:

```txt
large: 1920px max width
medium: 1200px max width
thumbnail: 400px max width
blur placeholder: 20px max width
```

Use `webp` for public display images unless there is a strong reason not to.

---

## Upload Flow

The upload flow must use presigned URLs.

Do not upload large image files through the application server unless absolutely necessary.

Correct flow:

```txt
1. Browser requests upload URL from API.
2. API validates filename, MIME type, size, and user permission.
3. API returns presigned R2 upload URL and storage key.
4. Browser uploads image directly to R2.
5. Browser notifies API that upload has completed.
6. API creates or updates photo metadata in DB.
7. Background processing generates resized web images.
8. Photo status becomes "ready".
```

---

## API Design

Recommended API routes:

```txt
POST   /api/photos/upload-url
POST   /api/photos
GET    /api/photos
GET    /api/photos/:id
PATCH  /api/photos/:id
DELETE /api/photos/:id

GET    /api/photos/:id/download-url

GET    /api/tags
POST   /api/tags

GET    /api/collections
POST   /api/collections
GET    /api/collections/:slug
PATCH  /api/collections/:id
DELETE /api/collections/:id
```

---

## Upload URL Endpoint

### `POST /api/photos/upload-url`

Purpose:

Create a presigned upload URL for a private original image.

Request body:

```json
{
  "filename": "IMG_1234.jpg",
  "contentType": "image/jpeg",
  "size": 482938
}
```

Required validation:

* File must be an image.
* Allowed MIME types:

  * `image/jpeg`
  * `image/png`
  * `image/webp`
  * `image/heic`
  * `image/heif`
* Reject files that are too large.
* Default max size should be conservative. For this project, 10MB is enough unless changed later.
* Never trust the client-provided filename.
* Generate a safe internal storage key.
* Require admin authentication unless public uploads are explicitly supported.

Response:

```json
{
  "uploadUrl": "https://...",
  "photoId": "01HX...",
  "storageKeyOriginal": "private/originals/2026/05/18/01HX-original.jpg"
}
```

---

## Photo Creation Endpoint

### `POST /api/photos`

Purpose:

Create the photo metadata record after original upload.

Request body:

```json
{
  "photoId": "01HX...",
  "storageKeyOriginal": "private/originals/2026/05/18/01HX-original.jpg",
  "title": "Euljiro Night Street",
  "description": "Rainy night snapshot",
  "takenAt": "2026-05-18T20:13:00+09:00",
  "tags": ["euljiro", "night", "street"],
  "visibility": "public"
}
```

The API should create a photo record with:

```txt
status = "processing"
```

After image processing is complete, update:

```txt
status = "ready"
```

---

## Photo List Endpoint

### `GET /api/photos`

Purpose:

Return paginated photo records.

Use cursor pagination, not offset pagination.

Example query:

```txt
GET /api/photos?limit=30&cursor=...
```

Response:

```json
{
  "items": [
    {
      "id": "01HX...",
      "title": "Euljiro Night Street",
      "slug": "euljiro-night-street",
      "description": "Rainy night snapshot",
      "thumbnailUrl": "https://cdn.example.com/photos/2026/05/18/01HX-thumb.webp",
      "mediumUrl": "https://cdn.example.com/photos/2026/05/18/01HX-medium.webp",
      "largeUrl": "https://cdn.example.com/photos/2026/05/18/01HX-large.webp",
      "width": 1600,
      "height": 1067,
      "takenAt": "2026-05-18T20:13:00+09:00",
      "tags": ["euljiro", "night", "street"]
    }
  ],
  "nextCursor": "01HW..."
}
```

Only return public photos on public routes.

Admin routes may return private and draft photos.

---

## Original Download Endpoint

### `GET /api/photos/:id/download-url`

Purpose:

Generate a short-lived signed GET URL for the private original image.

Rules:

* Require admin authentication.
* Do not expose the private storage key unless necessary.
* Signed URL should expire quickly.
* Recommended expiry: 5 to 10 minutes.

Response:

```json
{
  "downloadUrl": "https://...",
  "expiresIn": 600
}
```

---

## Database Schema

Use this as the base schema.

### `photos`

```sql
CREATE TABLE photos (
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Valid `status` values:

```txt
pending
uploading
processing
ready
failed
deleted
```

Valid `visibility` values:

```txt
private
public
unlisted
draft
```

---

### `tags`

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `photo_tags`

```sql
CREATE TABLE photo_tags (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);
```

---

### `collections`

```sql
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  cover_photo_id TEXT REFERENCES photos(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `collection_photos`

```sql
CREATE TABLE collection_photos (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, photo_id)
);
```

---

## Image Processing

Generated images should be created from the private original.

Processing steps:

```txt
1. Read original from R2.
2. Extract useful EXIF metadata.
3. Remove sensitive EXIF from public images.
4. Generate large, medium, thumbnail, and blur versions.
5. Upload generated images to public R2 path.
6. Update DB with generated storage keys, width, height, and status.
```

Important privacy rule:

Public images should not contain GPS EXIF metadata.

The database may store GPS information, but public display should require:

```txt
show_location = true
```

Default should be:

```txt
show_location = false
```

---

## Security Rules

Follow these rules strictly:

1. Never store image files in the database.
2. Never expose private original image URLs publicly.
3. Never use user-provided filenames as storage keys.
4. Always validate MIME type and file size before issuing upload URLs.
5. Keep original images private.
6. Use signed URLs for original downloads.
7. Strip GPS EXIF data from public images.
8. Admin-only routes must require authentication.
9. Deleting a photo should mark DB status as `deleted` before removing storage files.
10. Do not log signed URLs, private storage keys, or secrets.
11. Do not commit `.env` files.
12. Do not directly read, inspect, print, parse, or modify files whose names begin with `.env` without first asking the owner for explicit permission.
13. Do not expose R2 credentials to the browser.

---

## Environment Variables

Use environment variables for all secrets.

Example:

```env
DATABASE_URL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_PRIVATE=
R2_BUCKET_PUBLIC=
R2_PUBLIC_BASE_URL=

NEXT_PUBLIC_SITE_URL=

ADMIN_EMAIL=
AUTH_SECRET=
```

Rules:

* Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.
* Never prefix secrets with `NEXT_PUBLIC_`.
* R2 secret keys must only be used server-side.

---

## Recommended Folder Structure

```txt
src/
  app/
    archive/
      page.tsx
      [slug]/
        page.tsx

    admin/
      photos/
        page.tsx
        upload/
          page.tsx
        [id]/
          edit/
            page.tsx

    api/
      photos/
        route.ts
        upload-url/
          route.ts
        [id]/
          route.ts
          download-url/
            route.ts

      tags/
        route.ts

      collections/
        route.ts
        [slug]/
          route.ts

  components/
    photo/
      PhotoGrid.tsx
      PhotoCard.tsx
      PhotoDetail.tsx
      PhotoUploadForm.tsx

  lib/
    db.ts
    r2.ts
    auth.ts
    image.ts
    slug.ts
    validation.ts

  server/
    photos/
      createPhoto.ts
      getPhotos.ts
      updatePhoto.ts
      deletePhoto.ts
      generateUploadUrl.ts
      generateDownloadUrl.ts
      processPhoto.ts

  types/
    photo.ts
    tag.ts
    collection.ts
```

---

## Coding Standards

Use TypeScript.

Prefer:

```txt
- explicit types
- server-side validation
- small composable functions
- predictable API response shapes
- cursor pagination
- stable storage key generation
```

Avoid:

```txt
- storing image base64 strings
- using original filenames as final object keys
- exposing raw R2 keys on public pages
- mixing upload logic directly into UI components
- adding unnecessary dependencies
- building complex abstractions before needed
```

---

## Naming Rules

Use a generated ID for each photo.

Recommended ID types:

```txt
ULID
UUID
cuid
nanoid
```

Storage keys should include date paths:

```txt
private/originals/YYYY/MM/DD/{photoId}-original.{ext}
public/photos/YYYY/MM/DD/{photoId}-thumb.webp
public/photos/YYYY/MM/DD/{photoId}-medium.webp
public/photos/YYYY/MM/DD/{photoId}-large.webp
```

Do not use:

```txt
IMG_1234.jpg
KakaoTalk_20260518_123.jpg
my-photo-final-final.jpg
```

as final storage keys.

---

## UI Requirements

The archive should support:

```txt
- responsive photo grid
- photo detail page
- tag filtering
- collection pages
- upload page for admin
- edit metadata page
- private/public/draft state
- loading skeletons
- blur placeholder where possible
```

The visual tone should be:

```txt
quiet
minimal
archive-like
photography-first
not overly decorative
```

Prioritize image viewing experience over UI complexity.

---

## Performance Rules

Use optimized images.

For public pages:

* Use thumbnails in grids.
* Use medium or large images in detail views.
* Do not load originals in the browser.
* Use lazy loading.
* Use width and height to avoid layout shift.
* Cache public processed images aggressively.
* Keep API payloads small.

For photo lists:

* Use cursor pagination.
* Default limit: 30.
* Maximum limit: 100.

---

## Deletion Strategy

Use soft deletion first.

When a photo is deleted:

```txt
1. Set status = "deleted".
2. Hide it from public and admin default views.
3. Optionally queue storage object deletion.
4. Delete R2 files only after confirmation or cleanup job.
```

This prevents accidental permanent loss.

---

## Agent Instructions

When modifying this project, agents must follow these rules:

1. Preserve the architecture: DB metadata + R2 image storage.
2. Do not introduce DB binary image storage.
3. Do not make original images public.
4. Do not expose R2 credentials client-side.
5. Use presigned URLs for uploads.
6. Use signed URLs for private original downloads.
7. Validate user input at API boundaries.
8. Prefer simple, maintainable code over clever abstractions.
9. Keep cost low.
10. Keep privacy as a default.
11. Document new environment variables.
12. Before accessing or changing any file whose name begins with `.env`, stop and ask the owner for explicit permission. This includes checking whether values are set, parsing the file for scripts, and editing values.
13. Update this file when architecture decisions change.

---

## Initial Implementation Order

Build in this order:

```txt
1. Database schema
2. R2 client setup
3. Presigned upload URL API
4. Photo metadata creation API
5. Basic admin upload page
6. Public photo list API
7. Public archive grid page
8. Photo detail page
9. Image processing pipeline
10. Tags
11. Collections
12. Signed original download
13. Search and filters
```

Do not start with advanced UI before upload, storage, and metadata flow are stable.

---

## MVP Scope

The first version only needs:

```txt
- admin upload
- metadata save
- public archive grid
- photo detail page
- tags
- original private storage
- public thumbnail/medium/large images
```

Do not add:

```txt
- comments
- likes
- user accounts for visitors
- social features
- complex analytics
- marketplace features
```

unless explicitly requested.

---

## Cost Assumption

The project assumes small image files.

Average original photo size:

```txt
500KB or less
```

This means storage costs should remain very low even with thousands of images.

The architecture should remain compatible with a larger archive, but do not over-engineer for enterprise scale.

---

## Final Design Decision

Use this final strategy:

```txt
Original images:
- private R2 storage
- accessible only through short-lived signed URLs

Web images:
- generated from originals
- stripped of sensitive EXIF metadata
- stored in public R2 path
- served through CDN

Database:
- stores metadata and storage keys only

Application:
- Next.js frontend and API
- admin upload flow
- public archive browsing
```

This is the canonical architecture for the project unless the owner explicitly changes it.
