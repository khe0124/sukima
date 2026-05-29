import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";
import { z } from "zod";

import { getPool, query } from "@/lib/db";
import { buildProcessedStorageKeys, generateProcessedImages } from "@/lib/image-processing";
import { normalizePhotoListLimit, toPublicPhotoUrl } from "@/lib/photos";
import { createOriginalDownloadUrl, readPrivateObject, writePublicObject } from "@/lib/r2";
import { slugify } from "@/lib/slug";
import type { PhotoAssetListItem, PhotoListItem } from "@/types/photo";

const photoAssetInputSchema = z.object({
  storageKeyOriginal: z.string().startsWith("private/originals/"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false)
});

const createPhotoSchema = z
  .object({
  photoId: z.string().uuid(),
  storageKeyOriginal: z.string().startsWith("private/originals/"),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  takenAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  visibility: z.enum(["private", "public", "unlisted", "draft"]).default("private"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  assets: z.array(photoAssetInputSchema).max(20).default([]),
  collectionIds: z.array(z.string().uuid()).max(20).default([])
  })
  .superRefine((photo, context) => {
    if (photo.assets.length === 0) return;

    const primaryAssets = photo.assets.filter((asset) => asset.isPrimary);
    if (primaryAssets.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one representative image is required.",
        path: ["assets"]
      });
    }

    if (primaryAssets[0] && primaryAssets[0].storageKeyOriginal !== photo.storageKeyOriginal) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Representative image must match the primary original key.",
        path: ["assets"]
      });
    }

    const seenStorageKeys = new Set<string>();
    for (const [index, asset] of photo.assets.entries()) {
      if (seenStorageKeys.has(asset.storageKeyOriginal)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate photo asset original key.",
          path: ["assets", index, "storageKeyOriginal"]
        });
      }
      seenStorageKeys.add(asset.storageKeyOriginal);
    }
  });

const updatePhotoSchema = z.object({
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  takenAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  visibility: z.enum(["private", "public", "unlisted", "draft"]).optional(),
  collectionIds: z.array(z.string().uuid()).max(20).optional(),
  primaryAssetId: z.string().uuid().optional()
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

type PhotoSitemapRow = {
  slug: string;
  updated_at: Date | null;
  uploaded_at: Date | null;
};

type PhotoAssetRow = {
  id: string;
  photo_id: string;
  storage_key_original: string;
  storage_key_thumbnail: string | null;
  storage_key_medium: string | null;
  storage_key_large: string | null;
  storage_key_blur: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  is_primary: boolean;
};

type PrimaryPhotoAssetRow = {
  id: string;
  storage_key_original: string;
  storage_key_thumbnail: string | null;
  storage_key_medium: string | null;
  storage_key_large: string | null;
  storage_key_blur: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
};

const photoStatuses = ["pending", "uploading", "processing", "ready", "failed"] as const;
const photoVisibilities = ["private", "public", "unlisted", "draft"] as const;
const photoListSorts = ["newest", "oldest", "taken-newest", "taken-oldest", "title-asc", "title-desc"] as const;

type PhotoListStatus = (typeof photoStatuses)[number];
type PhotoListVisibility = (typeof photoVisibilities)[number];
type PhotoListSort = (typeof photoListSorts)[number];

type PhotoListQueryInput = {
  limit?: string | null;
  cursor?: string | null;
  tag?: string | null;
  search?: string | null;
  status?: string | null;
  visibility?: string | null;
  sort?: string | null;
};

function normalizeTextQuery(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim().slice(0, maxLength) ?? "";
  return normalized || null;
}

function isPhotoListStatus(value: string | null): value is PhotoListStatus {
  return photoStatuses.includes(value as PhotoListStatus);
}

function isPhotoListVisibility(value: string | null): value is PhotoListVisibility {
  return photoVisibilities.includes(value as PhotoListVisibility);
}

function isPhotoListSort(value: string | null): value is PhotoListSort {
  return photoListSorts.includes(value as PhotoListSort);
}

export function parsePhotoListQuery(input: PhotoListQueryInput) {
  const tagSlug = normalizeTextQuery(input.tag, 80);
  const status = normalizeTextQuery(input.status, 24);
  const visibility = normalizeTextQuery(input.visibility, 24);
  const sort = normalizeTextQuery(input.sort, 24);

  return {
    limit: normalizePhotoListLimit(input.limit ?? null),
    cursor: normalizeTextQuery(input.cursor, 120),
    search: normalizeTextQuery(input.search, 160),
    tag: tagSlug ? slugify(tagSlug) || null : null,
    status: isPhotoListStatus(status) ? status : null,
    visibility: isPhotoListVisibility(visibility) ? visibility : null,
    sort: isPhotoListSort(sort) ? sort : "newest"
  };
}

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
    ...(parsed.tags ? { tags: normalizeTagNames(parsed.tags) } : {})
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

function mapPhotoAssetRow(row: PhotoAssetRow): PhotoAssetListItem {
  return {
    id: row.id,
    photoId: row.photo_id,
    storageKeyOriginal: row.storage_key_original,
    thumbnailUrl: toPublicPhotoUrl(row.storage_key_thumbnail),
    mediumUrl: toPublicPhotoUrl(row.storage_key_medium),
    largeUrl: toPublicPhotoUrl(row.storage_key_large),
    blurUrl: toPublicPhotoUrl(row.storage_key_blur),
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary
  };
}

export function getCollectionMembershipChanges(currentIds: string[], desiredIds: string[]) {
  const current = new Set(currentIds);
  const desired = new Set(desiredIds);

  return {
    removed: currentIds.filter((collectionId) => !desired.has(collectionId)),
    added: desiredIds.filter((collectionId) => !current.has(collectionId))
  };
}

async function replacePhotoCollections(client: PoolClient, photoId: string, collectionIds: string[]) {
  const current = await client.query<{ collection_id: string }>(
    "SELECT collection_id FROM collection_photos WHERE photo_id = $1",
    [photoId]
  );
  const { added, removed } = getCollectionMembershipChanges(
    current.rows.map((row) => row.collection_id),
    collectionIds
  );

  for (const collectionId of removed) {
    await client.query("DELETE FROM collection_photos WHERE photo_id = $1 AND collection_id = $2", [
      photoId,
      collectionId
    ]);
  }

  for (const collectionId of added) {
    await client.query(
      `INSERT INTO collection_photos (collection_id, photo_id, sort_order)
       VALUES (
         $1,
         $2,
         COALESCE((SELECT MAX(sort_order) + 1 FROM collection_photos WHERE collection_id = $1), 0)
       )
       ON CONFLICT DO NOTHING`,
      [collectionId, photoId]
    );
  }
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

    const assetInputs =
      parsed.assets.length > 0
        ? parsed.assets
        : [
            {
              storageKeyOriginal: parsed.storageKeyOriginal,
              fileSize: parsed.fileSize,
              mimeType: parsed.mimeType,
              sortOrder: 0,
              isPrimary: true
            }
          ];

    for (const asset of assetInputs) {
      await client.query(
        `INSERT INTO photo_assets (
          id, photo_id, storage_key_original, file_size, mime_type, sort_order, is_primary
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          parsed.photoId,
          asset.storageKeyOriginal,
          asset.fileSize || null,
          asset.mimeType || null,
          asset.sortOrder,
          asset.isPrimary
        ]
      );
    }

    await replacePhotoCollections(client, parsed.photoId, parsed.collectionIds);

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
  tag,
  search,
  status,
  visibility,
  sort
}: {
  limit: string | null;
  cursor: string | null;
  includePrivate?: boolean;
  tag?: string | null;
  search?: string | null;
  status?: string | null;
  visibility?: string | null;
  sort?: string | null;
}) {
  const listQuery = parsePhotoListQuery({ limit, cursor, tag, search, status, visibility, sort });
  const values: unknown[] = [listQuery.limit + 1];
  const where = [includePrivate ? "p.status <> 'deleted'" : "p.visibility = 'public' AND p.status = 'ready'"];

  if (includePrivate && listQuery.status) {
    values.push(listQuery.status);
    where.push(`p.status = $${values.length}`);
  }

  if (includePrivate && listQuery.visibility) {
    values.push(listQuery.visibility);
    where.push(`p.visibility = $${values.length}`);
  }

  if (listQuery.search) {
    values.push(`%${listQuery.search}%`);
    const searchValue = `$${values.length}`;
    where.push(
      `(p.title ILIKE ${searchValue}
        OR p.description ILIKE ${searchValue}
        OR EXISTS (
          SELECT 1
          FROM photo_tags search_pt
          JOIN tags search_t ON search_t.id = search_pt.tag_id
          WHERE search_pt.photo_id = p.id AND search_t.name ILIKE ${searchValue}
        ))`
    );
  }

  if (listQuery.tag) {
    values.push(listQuery.tag);
    where.push(
      `EXISTS (
        SELECT 1
        FROM photo_tags filter_pt
        JOIN tags filter_t ON filter_t.id = filter_pt.tag_id
        WHERE filter_pt.photo_id = p.id AND filter_t.slug = $${values.length}
      )`
    );
  }

  const cursorClauseBySort: Record<PhotoListSort, string> = {
    newest: "(p.uploaded_at, p.id) < ((SELECT cursor_photo.uploaded_at FROM photos cursor_photo WHERE cursor_photo.id = $cursor), $cursor)",
    oldest: "(p.uploaded_at, p.id) > ((SELECT cursor_photo.uploaded_at FROM photos cursor_photo WHERE cursor_photo.id = $cursor), $cursor)",
    "taken-newest":
      "(COALESCE(p.taken_at, p.uploaded_at), p.id) < ((SELECT COALESCE(cursor_photo.taken_at, cursor_photo.uploaded_at) FROM photos cursor_photo WHERE cursor_photo.id = $cursor), $cursor)",
    "taken-oldest":
      "(COALESCE(p.taken_at, p.uploaded_at), p.id) > ((SELECT COALESCE(cursor_photo.taken_at, cursor_photo.uploaded_at) FROM photos cursor_photo WHERE cursor_photo.id = $cursor), $cursor)",
    "title-asc":
      "(COALESCE(LOWER(p.title), ''), p.id) > ((SELECT COALESCE(LOWER(cursor_photo.title), '') FROM photos cursor_photo WHERE cursor_photo.id = $cursor), $cursor)",
    "title-desc":
      "(COALESCE(LOWER(p.title), ''), p.id) < ((SELECT COALESCE(LOWER(cursor_photo.title), '') FROM photos cursor_photo WHERE cursor_photo.id = $cursor), $cursor)"
  };

  if (listQuery.cursor) {
    values.push(listQuery.cursor);
    where.push(cursorClauseBySort[listQuery.sort].replaceAll("$cursor", `$${values.length}`));
  }

  const orderByBySort: Record<PhotoListSort, string> = {
    newest: "p.uploaded_at DESC, p.id DESC",
    oldest: "p.uploaded_at ASC, p.id ASC",
    "taken-newest": "COALESCE(p.taken_at, p.uploaded_at) DESC, p.id DESC",
    "taken-oldest": "COALESCE(p.taken_at, p.uploaded_at) ASC, p.id ASC",
    "title-asc": "COALESCE(LOWER(p.title), '') ASC, p.id ASC",
    "title-desc": "COALESCE(LOWER(p.title), '') DESC, p.id DESC"
  };

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
     ORDER BY ${orderByBySort[listQuery.sort]}
     LIMIT $1`,
    values
  );

  const rows = result.rows.slice(0, listQuery.limit);
  const items: PhotoListItem[] = rows.map(mapPhotoRow);

  return {
    items,
    nextCursor: result.rows.length > listQuery.limit ? rows[rows.length - 1]?.id ?? null : null
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

export async function getPublicPhotoSitemapEntries() {
  const result = await query<PhotoSitemapRow>(
    `SELECT slug, updated_at, uploaded_at
     FROM photos
     WHERE visibility = 'public' AND status = 'ready' AND slug IS NOT NULL
     ORDER BY COALESCE(updated_at, uploaded_at) DESC`
  );

  return result.rows.map((row) => ({
    slug: row.slug,
    lastModified: (row.updated_at ?? row.uploaded_at ?? new Date()).toISOString()
  }));
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
  const shouldUpdateTitle = parsed.title !== undefined;
  const title = shouldUpdateTitle ? parsed.title || null : null;
  const baseSlug = title ? slugify(title) : photoId;
  const slug = `${baseSlug}-${photoId.slice(0, 8)}`;
  const shouldUpdateDescription = parsed.description !== undefined;
  const shouldUpdateTakenAt = parsed.takenAt !== undefined;
  const takenAt = parsed.takenAt ? parsed.takenAt : null;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const photo = await client.query<{ id: string }>(
      `UPDATE photos
       SET
         title = CASE WHEN $2 THEN $3 ELSE title END,
         slug = CASE WHEN $2 THEN $4 ELSE slug END,
         description = CASE WHEN $5 THEN $6 ELSE description END,
         visibility = COALESCE($9, visibility),
         taken_at = CASE WHEN $7 THEN $8 ELSE taken_at END,
         updated_at = NOW()
       WHERE id = $1 AND status <> 'deleted'
       RETURNING id`,
      [
        photoId,
        shouldUpdateTitle,
        title,
        slug,
        shouldUpdateDescription,
        parsed.description || null,
        shouldUpdateTakenAt,
        takenAt,
        parsed.visibility || null
      ]
    );

    if (!photo.rows[0]) {
      throw new Error("Photo not found.");
    }

    if (parsed.tags) {
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
    }

    if (parsed.collectionIds) {
      await replacePhotoCollections(client, photoId, parsed.collectionIds);
    }

    if (parsed.primaryAssetId) {
      const selectedAsset = await client.query<PrimaryPhotoAssetRow>(
        `SELECT
           id,
           storage_key_original,
           storage_key_thumbnail,
           storage_key_medium,
           storage_key_large,
           storage_key_blur,
           width,
           height,
           file_size,
           mime_type
         FROM photo_assets
         WHERE id = $1 AND photo_id = $2
         LIMIT 1`,
        [parsed.primaryAssetId, photoId]
      );
      const asset = selectedAsset.rows[0];

      if (!asset) {
        throw new Error("Photo asset not found.");
      }

      if (!asset.storage_key_thumbnail && !asset.storage_key_medium && !asset.storage_key_large) {
        throw new Error("Representative image is not ready.");
      }

      await client.query(
        `UPDATE photo_assets
         SET is_primary = FALSE, updated_at = NOW()
         WHERE photo_id = $1`,
        [photoId]
      );
      await client.query(
        `UPDATE photo_assets
         SET is_primary = TRUE, updated_at = NOW()
         WHERE id = $1 AND photo_id = $2`,
        [parsed.primaryAssetId, photoId]
      );
      await client.query(
        `UPDATE photos
         SET
           storage_key_original = $2,
           storage_key_thumbnail = $3,
           storage_key_medium = $4,
           storage_key_large = $5,
           storage_key_blur = $6,
           width = $7,
           height = $8,
           file_size = $9,
           mime_type = $10,
           updated_at = NOW()
         WHERE id = $1`,
        [
          photoId,
          asset.storage_key_original,
          asset.storage_key_thumbnail,
          asset.storage_key_medium,
          asset.storage_key_large,
          asset.storage_key_blur,
          asset.width,
          asset.height,
          asset.file_size,
          asset.mime_type
        ]
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

export async function getPhotoAssets(photoId: string) {
  const result = await query<PhotoAssetRow>(
    `SELECT
       id,
       photo_id,
       storage_key_original,
       storage_key_thumbnail,
       storage_key_medium,
       storage_key_large,
       storage_key_blur,
       width,
       height,
       sort_order,
       is_primary
     FROM photo_assets
     WHERE photo_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [photoId]
  );

  return result.rows.map(mapPhotoAssetRow);
}

export async function getPhotoCollectionIds(photoId: string) {
  const result = await query<{ collection_id: string }>(
    `SELECT collection_id
     FROM collection_photos
     WHERE photo_id = $1
     ORDER BY collection_id ASC`,
    [photoId]
  );

  return result.rows.map((row) => row.collection_id);
}

export async function getPhotoBySlugWithAssets(slug: string) {
  const photo = await getPhotoBySlug(slug);
  if (!photo) return null;

  const assets = await getPhotoAssets(photo.id);
  return {
    ...photo,
    assets
  };
}

export async function getAdminPhotoByIdWithRelations(photoId: string) {
  const photo = await getAdminPhotoById(photoId);
  if (!photo) return null;

  const [assets, collectionIds] = await Promise.all([
    getPhotoAssets(photoId),
    getPhotoCollectionIds(photoId)
  ]);

  return {
    ...photo,
    assets,
    collectionIds
  };
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

    const assets = await query<PhotoAssetRow>(
      `SELECT
         id,
         photo_id,
         storage_key_original,
         storage_key_thumbnail,
         storage_key_medium,
         storage_key_large,
         storage_key_blur,
         width,
         height,
         sort_order,
         is_primary
       FROM photo_assets
       WHERE photo_id = $1
       ORDER BY sort_order ASC`,
      [photoId]
    );

    for (const asset of assets.rows) {
      const assetKeys = buildProcessedStorageKeys(asset.storage_key_original);
      const isRepresentativeAsset = asset.storage_key_original === row.storage_key_original;

      if (isRepresentativeAsset) {
        await query(
          `UPDATE photo_assets
           SET
             storage_key_large = $2,
             storage_key_medium = $3,
             storage_key_thumbnail = $4,
             storage_key_blur = $5,
             width = $6,
             height = $7,
             is_primary = TRUE,
             updated_at = NOW()
           WHERE id = $1`,
          [asset.id, keys.large, keys.medium, keys.thumbnail, keys.blur, processed.width, processed.height]
        );
        continue;
      }

      const assetOriginal = await readPrivateObject(asset.storage_key_original);
      const assetProcessed = await generateProcessedImages(assetOriginal);

      for (const variant of assetProcessed.variants) {
        await writePublicObject({
          storageKey: assetKeys[variant.name],
          body: variant.buffer
        });
      }

      await query(
        `UPDATE photo_assets
         SET
           storage_key_large = $2,
           storage_key_medium = $3,
           storage_key_thumbnail = $4,
           storage_key_blur = $5,
           width = $6,
           height = $7,
           updated_at = NOW()
         WHERE id = $1`,
        [asset.id, assetKeys.large, assetKeys.medium, assetKeys.thumbnail, assetKeys.blur, assetProcessed.width, assetProcessed.height]
      );
    }

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
