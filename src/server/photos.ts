import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getPool, query } from "@/lib/db";
import { buildProcessedStorageKeys, generateProcessedImages } from "@/lib/image-processing";
import { normalizePhotoListLimit, toPublicPhotoUrl } from "@/lib/photos";
import { createOriginalDownloadUrl, readPrivateObject, writePublicObject } from "@/lib/r2";
import { slugify } from "@/lib/slug";
import type { PhotoListItem } from "@/types/photo";

const createPhotoSchema = z.object({
  photoId: z.string().uuid(),
  storageKeyOriginal: z.string().startsWith("private/originals/"),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  takenAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  visibility: z.enum(["private", "public", "unlisted", "draft"]).default("private"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional()
});

const updatePhotoSchema = z.object({
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  takenAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  visibility: z.enum(["private", "public", "unlisted", "draft"]).optional()
});

type CreatePhotoInput = z.infer<typeof createPhotoSchema>;
type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;

type PhotoRow = {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  status: "pending" | "uploading" | "processing" | "ready" | "failed" | "deleted";
  visibility: "private" | "public" | "unlisted" | "draft";
  storage_key_thumbnail: string | null;
  storage_key_medium: string | null;
  storage_key_large: string | null;
  storage_key_blur: string | null;
  width: number | null;
  height: number | null;
  taken_at: Date | null;
  uploaded_at: Date | null;
  tags: string[] | null;
};

type PhotoProcessRow = {
  id: string;
  storage_key_original: string;
};

type PhotoOriginalRow = {
  id: string;
  storage_key_original: string;
};

export function parseCreatePhotoRequest(input: unknown): CreatePhotoInput {
  const parsed = createPhotoSchema.parse(input);

  return {
    ...parsed,
    tags: normalizeTagNames(parsed.tags)
  };
}

export function parseUpdatePhotoRequest(input: unknown): UpdatePhotoInput {
  const parsed = updatePhotoSchema.parse(input);

  return {
    ...parsed,
    tags: normalizeTagNames(parsed.tags)
  };
}

function normalizeTagNames(tags: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const slug = slugify(tag);
    if (!slug || seen.has(slug)) continue;

    seen.add(slug);
    normalized.push(tag.trim());
  }

  return normalized;
}

function mapPhotoRow(row: PhotoRow): PhotoListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
    thumbnailUrl: toPublicPhotoUrl(row.storage_key_thumbnail),
    mediumUrl: toPublicPhotoUrl(row.storage_key_medium),
    largeUrl: toPublicPhotoUrl(row.storage_key_large),
    blurUrl: toPublicPhotoUrl(row.storage_key_blur),
    width: row.width,
    height: row.height,
    takenAt: row.taken_at?.toISOString() ?? null,
    uploadedAt: row.uploaded_at?.toISOString() ?? null,
    tags: row.tags ?? []
  };
}

export async function createPhoto(input: unknown) {
  const parsed = parseCreatePhotoRequest(input);
  const title = parsed.title || null;
  const baseSlug = title ? slugify(title) : parsed.photoId;
  const slug = `${baseSlug}-${parsed.photoId.slice(0, 8)}`;
  const takenAt = parsed.takenAt ? parsed.takenAt : null;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const photo = await client.query<{ id: string }>(
      `INSERT INTO photos (
        id, slug, title, description, status, visibility,
        storage_key_original, file_size, mime_type, taken_at
      )
      VALUES ($1, $2, $3, $4, 'processing', $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        parsed.photoId,
        slug,
        title,
        parsed.description || null,
        parsed.visibility,
        parsed.storageKeyOriginal,
        parsed.fileSize || null,
        parsed.mimeType || null,
        takenAt
      ]
    );

    for (const tagName of parsed.tags) {
      const normalizedName = tagName.trim();
      const tagSlug = slugify(normalizedName);
      if (!tagSlug) continue;

      const tag = await client.query<{ id: string }>(
        `INSERT INTO tags (id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [randomUUID(), normalizedName, tagSlug]
      );

      await client.query(
        `INSERT INTO photo_tags (photo_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [parsed.photoId, tag.rows[0].id]
      );
    }

    await client.query("COMMIT");
    return photo.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPhotos({
  limit,
  cursor,
  includePrivate = false,
  tag
}: {
  limit: string | null;
  cursor: string | null;
  includePrivate?: boolean;
  tag?: string | null;
}) {
  const normalizedLimit = normalizePhotoListLimit(limit);
  const values: unknown[] = [normalizedLimit + 1];
  const where = [includePrivate ? "p.status <> 'deleted'" : "p.visibility = 'public' AND p.status = 'ready'"];

  if (cursor) {
    values.push(cursor);
    where.push(`p.id < $${values.length}`);
  }

  const tagSlug = tag ? slugify(tag) : "";
  if (tagSlug) {
    values.push(tagSlug);
    where.push(
      `EXISTS (
        SELECT 1
        FROM photo_tags filter_pt
        JOIN tags filter_t ON filter_t.id = filter_pt.tag_id
        WHERE filter_pt.photo_id = p.id AND filter_t.slug = $${values.length}
      )`
    );
  }

  const result = await query<PhotoRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.description,
       p.status,
       p.visibility,
       p.storage_key_thumbnail,
       p.storage_key_medium,
       p.storage_key_large,
       p.storage_key_blur,
       p.width,
       p.height,
       p.taken_at,
       p.uploaded_at,
       COALESCE(array_remove(array_agg(t.name ORDER BY t.name), NULL), '{}') AS tags
     FROM photos p
     LEFT JOIN photo_tags pt ON pt.photo_id = p.id
     LEFT JOIN tags t ON t.id = pt.tag_id
     WHERE ${where.join(" AND ")}
     GROUP BY p.id
     ORDER BY p.uploaded_at DESC, p.id DESC
     LIMIT $1`,
    values
  );

  const rows = result.rows.slice(0, normalizedLimit);
  const items: PhotoListItem[] = rows.map(mapPhotoRow);

  return {
    items,
    nextCursor: result.rows.length > normalizedLimit ? rows[rows.length - 1]?.id ?? null : null
  };
}

export async function getPhotoBySlug(slug: string) {
  const result = await query<PhotoRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.description,
       p.status,
       p.visibility,
       p.storage_key_thumbnail,
       p.storage_key_medium,
       p.storage_key_large,
       p.storage_key_blur,
       p.width,
       p.height,
       p.taken_at,
       p.uploaded_at,
       COALESCE(array_remove(array_agg(t.name ORDER BY t.name), NULL), '{}') AS tags
     FROM photos p
     LEFT JOIN photo_tags pt ON pt.photo_id = p.id
     LEFT JOIN tags t ON t.id = pt.tag_id
     WHERE p.slug = $1 AND p.visibility = 'public' AND p.status = 'ready'
     GROUP BY p.id
     LIMIT 1`,
    [slug]
  );

  const row = result.rows[0];
  if (!row) return null;

  return mapPhotoRow(row);
}

export async function getAdminPhotoById(photoId: string) {
  const result = await query<PhotoRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.description,
       p.status,
       p.visibility,
       p.storage_key_thumbnail,
       p.storage_key_medium,
       p.storage_key_large,
       p.storage_key_blur,
       p.width,
       p.height,
       p.taken_at,
       p.uploaded_at,
       COALESCE(array_remove(array_agg(t.name ORDER BY t.name), NULL), '{}') AS tags
     FROM photos p
     LEFT JOIN photo_tags pt ON pt.photo_id = p.id
     LEFT JOIN tags t ON t.id = pt.tag_id
     WHERE p.id = $1 AND p.status <> 'deleted'
     GROUP BY p.id
     LIMIT 1`,
    [photoId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return mapPhotoRow(row);
}

export async function updatePhoto(photoId: string, input: unknown) {
  const parsed = parseUpdatePhotoRequest(input);
  const title = parsed.title || null;
  const baseSlug = title ? slugify(title) : photoId;
  const slug = `${baseSlug}-${photoId.slice(0, 8)}`;
  const takenAt = parsed.takenAt ? parsed.takenAt : null;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const photo = await client.query<{ id: string }>(
      `UPDATE photos
       SET
         title = $2,
         slug = $3,
         description = $4,
         visibility = COALESCE($5, visibility),
         taken_at = $6,
         updated_at = NOW()
       WHERE id = $1 AND status <> 'deleted'
       RETURNING id`,
      [photoId, title, slug, parsed.description || null, parsed.visibility || null, takenAt]
    );

    if (!photo.rows[0]) {
      throw new Error("Photo not found.");
    }

    await client.query("DELETE FROM photo_tags WHERE photo_id = $1", [photoId]);

    for (const tagName of parsed.tags) {
      const normalizedName = tagName.trim();
      const tagSlug = slugify(normalizedName);
      if (!tagSlug) continue;

      const tag = await client.query<{ id: string }>(
        `INSERT INTO tags (id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [randomUUID(), normalizedName, tagSlug]
      );

      await client.query(
        `INSERT INTO photo_tags (photo_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [photoId, tag.rows[0].id]
      );
    }

    await client.query("COMMIT");
    return getAdminPhotoById(photoId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function softDeletePhoto(photoId: string) {
  await query("UPDATE photos SET status = 'deleted', updated_at = NOW() WHERE id = $1", [photoId]);
}

export async function createPhotoOriginalDownloadUrl(photoId: string) {
  const result = await query<PhotoOriginalRow>(
    `SELECT id, storage_key_original
     FROM photos
     WHERE id = $1 AND status <> 'deleted'
     LIMIT 1`,
    [photoId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Photo not found.");
  }

  return {
    downloadUrl: await createOriginalDownloadUrl(row.storage_key_original),
    expiresIn: 600
  };
}

export async function processPhoto(photoId: string) {
  const photo = await query<PhotoProcessRow>(
    `SELECT id, storage_key_original
     FROM photos
     WHERE id = $1 AND status <> 'deleted'
     LIMIT 1`,
    [photoId]
  );
  const row = photo.rows[0];

  if (!row) {
    throw new Error("Photo not found.");
  }

  await query("UPDATE photos SET status = 'processing', updated_at = NOW() WHERE id = $1", [photoId]);

  try {
    const keys = buildProcessedStorageKeys(row.storage_key_original);
    const original = await readPrivateObject(row.storage_key_original);
    const processed = await generateProcessedImages(original);

    for (const variant of processed.variants) {
      await writePublicObject({
        storageKey: keys[variant.name],
        body: variant.buffer
      });
    }

    await query(
      `UPDATE photos
       SET
         status = 'ready',
         storage_key_large = $2,
         storage_key_medium = $3,
         storage_key_thumbnail = $4,
         storage_key_blur = $5,
         width = $6,
         height = $7,
         updated_at = NOW()
       WHERE id = $1`,
      [photoId, keys.large, keys.medium, keys.thumbnail, keys.blur, processed.width, processed.height]
    );

    return {
      id: photoId,
      status: "ready",
      keys,
      width: processed.width,
      height: processed.height
    };
  } catch (error) {
    await query("UPDATE photos SET status = 'failed', updated_at = NOW() WHERE id = $1", [photoId]);
    throw error;
  }
}
