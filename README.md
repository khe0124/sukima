# Sukima

Personal photo archive MVP built with Next.js, PostgreSQL, and Cloudflare R2.

## MVP 1 Scope

- Generate presigned upload URLs for private original images.
- Upload originals directly from the browser to private R2 storage.
- Save photo metadata, tags, and visibility to Postgres.
- Generate public WebP large, medium, thumbnail, and blur variants from private originals.
- List ready public photos through `GET /api/photos`.
- Provide a basic admin upload page with single and batch uploads at `/admin/photos/upload`.
- Provide admin photo list and edit screens at `/admin/photos`.
- Provide admin tag management at `/admin/tags`.
- Provide admin collection management at `/admin/collections`.
- Generate short-lived signed URLs for admin original downloads.
- Render public archive and detail pages at `/archive` and `/archive/[slug]`.
- Filter public archive pages by tag with `/archive?tag=...`.
- Render public collection pages at `/collections` and `/collections/[slug]`.
- Provide a logout button in the admin navigation.

Not included yet:

- Visitor accounts, comments, or likes
- Signed original downloads
- Background job queue for processing very large batches

## Environment

Copy `.env.example` to `.env.local` and fill in:

```env
DATABASE_URL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_PRIVATE=
R2_BUCKET_PUBLIC=
R2_PUBLIC_BASE_URL=

NEXT_PUBLIC_SITE_URL=
AUTH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

## Database

Run the schema in `db/schema.sql` against your Supabase Postgres or Neon database.

## Development

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000/admin/login
```

After login, go to `/admin/photos/upload`.

The upload form accepts multiple image files. Shared metadata such as description,
tags, taken date, and visibility is applied to every selected file. When multiple
files are selected, the title is combined with each filename to keep records easy
to distinguish.

After each original upload, the app processes that photo immediately:

```txt
private R2 original -> public WebP variants -> DB status ready
```

Public pages:

```txt
http://localhost:3000/archive
http://localhost:3000/archive?tag=street
http://localhost:3000/archive/[slug]
http://localhost:3000/collections
http://localhost:3000/collections/[slug]
```

Admin pages:

```txt
http://localhost:3000/admin/photos
http://localhost:3000/admin/photos/[id]/edit
http://localhost:3000/admin/tags
http://localhost:3000/admin/collections
http://localhost:3000/admin/collections/[id]/edit
```

## Verification

```bash
npm test
npm run lint
npm run build
```

## Next Steps

1. Add richer upload failure recovery and per-file retry controls.
2. Improve public archive and collection visual design.
3. Move image processing to a background job for larger batches.
4. Add deployment checklists for R2 CORS and database migrations.
5. Run a real DB/R2 end-to-end upload test before deployment.
