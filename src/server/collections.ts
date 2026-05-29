import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getPool, query } from "@/lib/db";
import { toPublicPhotoUrl } from "@/lib/photos";
import { slugify } from "@/lib/slug";
import type { PhotoListItem, PhotoVisibility } from "@/types/photo";

const collectionRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  visibility: z.enum(["private", "public", "unlisted", "draft"]).default("private"),
  coverPhotoId: z.string().uuid().optional().or(z.literal(""))
});

const collectionPhotosRequestSchema = z.object({
  photoIds: z.array(z.string().uuid()).max(200)
});

export type CollectionListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  visibility: PhotoVisibility;
  coverPhotoId: string | null;
  coverImageUrl?: string | null;
  photoCount: number;
};

type CollectionRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  visibility: PhotoVisibility;
  cover_photo_id: string | null;
  cover_storage_key_thumbnail?: string | null;
  cover_storage_key_medium?: string | null;
  photo_count: string | number;
};

type CollectionPhotoRow = {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  storage_key_thumbnail: string | null;
  storage_key_medium: string | null;
  storage_key_large: string | null;
  storage_key_blur: string | null;
  width: number | null;
  height: number | null;
  taken_at: Date | null;
  tags: string[] | null;
};
type CollectionSitemapRow = {
  slug: string;
  updated_at: Date | null;
  created_at: Date | null;
};


export function parseCollectionRequest(input: unknown) {
  return collectionRequestSchema.parse(input);
}

export function parseCollectionPhotosRequest(input: unknown) {
  return collectionPhotosRequestSchema.parse(input);
}

function mapCollectionRow(row: CollectionRow): CollectionListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility,
    coverPhotoId: row.cover_photo_id,
    coverImageUrl: toPublicPhotoUrl(row.cover_storage_key_thumbnail ?? null) ?? toPublicPhotoUrl(row.cover_storage_key_medium ?? null),
    photoCount: Number(row.photo_count)
  };
}

function mapCollectionPhotoRow(row: CollectionPhotoRow): PhotoListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    thumbnailUrl: toPublicPhotoUrl(row.storage_key_thumbnail),
    mediumUrl: toPublicPhotoUrl(row.storage_key_medium),
    largeUrl: toPublicPhotoUrl(row.storage_key_large),
    blurUrl: toPublicPhotoUrl(row.storage_key_blur),
    width: row.width,
    height: row.height,
    takenAt: row.taken_at?.toISOString() ?? null,
    tags: row.tags ?? []
  };
}

export function buildPublicCollectionWhere() {
  return "c.visibility = 'public'";
}

export async function getCollections() {
  const result = await query<CollectionRow>(
    `SELECT
       c.id,
       c.title,
       c.slug,
       c.description,
       c.visibility,
       c.cover_photo_id,
       cover.storage_key_thumbnail AS cover_storage_key_thumbnail,
       cover.storage_key_medium AS cover_storage_key_medium,
       COUNT(cp.photo_id) AS photo_count
     FROM collections c
     LEFT JOIN photos cover ON cover.id = c.cover_photo_id AND cover.visibility = 'public' AND cover.status = 'ready'
     LEFT JOIN collection_photos cp ON cp.collection_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );

  return result.rows.map(mapCollectionRow);
}

export async function getCollectionById(collectionId: string) {
  const result = await query<CollectionRow>(
    `SELECT
       c.id,
       c.title,
       c.slug,
       c.description,
       c.visibility,
       c.cover_photo_id,
       NULL AS cover_storage_key_thumbnail,
       NULL AS cover_storage_key_medium,
       COUNT(cp.photo_id) AS photo_count
     FROM collections c
     LEFT JOIN collection_photos cp ON cp.collection_id = c.id
     WHERE c.id = $1
     GROUP BY c.id
     LIMIT 1`,
    [collectionId]
  );

  const row = result.rows[0];
  return row ? mapCollectionRow(row) : null;
}

export async function getCollectionPhotoIds(collectionId: string) {
  const result = await query<{ photo_id: string }>(
    `SELECT photo_id
     FROM collection_photos
     WHERE collection_id = $1
     ORDER BY sort_order ASC, photo_id ASC`,
    [collectionId]
  );

  return result.rows.map((row) => row.photo_id);
}

export async function getPublicCollections() {
  const result = await query<CollectionRow>(
    `SELECT
       c.id,
       c.title,
       c.slug,
       c.description,
       c.visibility,
       c.cover_photo_id,
       cover.storage_key_thumbnail AS cover_storage_key_thumbnail,
       cover.storage_key_medium AS cover_storage_key_medium,
       COUNT(cp.photo_id) AS photo_count
     FROM collections c
     LEFT JOIN photos cover ON cover.id = c.cover_photo_id AND cover.visibility = 'public' AND cover.status = 'ready'
     LEFT JOIN collection_photos cp ON cp.collection_id = c.id
     WHERE ${buildPublicCollectionWhere()}
     GROUP BY c.id, cover.storage_key_thumbnail, cover.storage_key_medium
     ORDER BY c.created_at DESC`
  );

  return result.rows.map(mapCollectionRow);
}
export async function getPublicCollectionSitemapEntries() {
  const result = await query<CollectionSitemapRow>(
    `SELECT slug, updated_at, created_at
     FROM collections
     WHERE visibility = 'public'
     ORDER BY COALESCE(updated_at, created_at) DESC`
  );

  return result.rows.map((row) => ({
    slug: row.slug,
    lastModified: (row.updated_at ?? row.created_at ?? new Date()).toISOString()
  }));
}


export async function getPublicCollectionBySlug(slug: string) {
  const collectionResult = await query<CollectionRow>(
    `SELECT
       c.id,
       c.title,
       c.slug,
       c.description,
       c.visibility,
       c.cover_photo_id,
       cover.storage_key_thumbnail AS cover_storage_key_thumbnail,
       cover.storage_key_medium AS cover_storage_key_medium,
       COUNT(cp.photo_id) AS photo_count
     FROM collections c
     LEFT JOIN photos cover ON cover.id = c.cover_photo_id AND cover.visibility = 'public' AND cover.status = 'ready'
     LEFT JOIN collection_photos cp ON cp.collection_id = c.id
     WHERE ${buildPublicCollectionWhere()} AND c.slug = $1
     GROUP BY c.id, cover.storage_key_thumbnail, cover.storage_key_medium
     LIMIT 1`,
    [slug]
  );
  const collection = collectionResult.rows[0];

  if (!collection) return null;

  const photos = await query<CollectionPhotoRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.description,
       p.storage_key_thumbnail,
       p.storage_key_medium,
       p.storage_key_large,
       p.storage_key_blur,
       p.width,
       p.height,
       p.taken_at,
       COALESCE(array_remove(array_agg(t.name ORDER BY t.name), NULL), '{}') AS tags
     FROM collection_photos cp
     JOIN photos p ON p.id = cp.photo_id
     LEFT JOIN photo_tags pt ON pt.photo_id = p.id
     LEFT JOIN tags t ON t.id = pt.tag_id
     WHERE cp.collection_id = $1 AND p.visibility = 'public' AND p.status = 'ready'
     GROUP BY p.id, cp.sort_order
     ORDER BY cp.sort_order ASC, p.uploaded_at DESC`,
    [collection.id]
  );

  return {
    collection: mapCollectionRow(collection),
    photos: photos.rows.map(mapCollectionPhotoRow)
  };
}

export async function createCollection(input: unknown) {
  const parsed = parseCollectionRequest(input);
  const id = randomUUID();
  const slug = `${slugify(parsed.title)}-${id.slice(0, 8)}`;

  const result = await query<CollectionRow>(
    `INSERT INTO collections (id, title, slug, description, visibility, cover_photo_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, slug, description, visibility, cover_photo_id, 0 AS photo_count`,
    [id, parsed.title, slug, parsed.description || null, parsed.visibility, parsed.coverPhotoId || null]
  );

  return mapCollectionRow(result.rows[0]);
}

export async function updateCollection(collectionId: string, input: unknown) {
  const parsed = parseCollectionRequest(input);
  const slug = `${slugify(parsed.title)}-${collectionId.slice(0, 8)}`;

  const result = await query<CollectionRow>(
    `UPDATE collections
     SET
       title = $2,
       slug = $3,
       description = $4,
       visibility = $5,
       cover_photo_id = $6,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, slug, description, visibility, cover_photo_id, 0 AS photo_count`,
    [collectionId, parsed.title, slug, parsed.description || null, parsed.visibility, parsed.coverPhotoId || null]
  );

  if (!result.rows[0]) {
    throw new Error("Collection not found.");
  }

  return mapCollectionRow(result.rows[0]);
}

export async function updateCollectionPhotos(collectionId: string, input: unknown) {
  const parsed = parseCollectionPhotosRequest(input);
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM collection_photos WHERE collection_id = $1", [collectionId]);

    for (const [index, photoId] of parsed.photoIds.entries()) {
      await client.query(
        `INSERT INTO collection_photos (collection_id, photo_id, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (collection_id, photo_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
        [collectionId, photoId, index]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCollection(collectionId: string) {
  await query("DELETE FROM collections WHERE id = $1", [collectionId]);
}
