import { randomUUID } from "node:crypto";

import { z } from "zod";

import { query } from "@/lib/db";
import { slugify } from "@/lib/slug";

const tagRequestSchema = z.object({
  name: z.string().trim().min(1).max(40)
});

export type TagListItem = {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
};

type TagRow = {
  id: string;
  name: string;
  slug: string;
  photo_count: string | number;
};

export function parseTagRequest(input: unknown) {
  return tagRequestSchema.parse(input);
}

function mapTagRow(row: TagRow): TagListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    photoCount: Number(row.photo_count)
  };
}

export async function getTags() {
  const result = await query<TagRow>(
    `SELECT
       t.id,
       t.name,
       t.slug,
       COUNT(pt.photo_id) AS photo_count
     FROM tags t
     LEFT JOIN photo_tags pt ON pt.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name ASC`
  );

  return result.rows.map(mapTagRow);
}

export async function createTag(input: unknown) {
  const parsed = parseTagRequest(input);
  const slug = slugify(parsed.name);

  if (!slug) {
    throw new Error("Invalid tag name.");
  }

  const result = await query<TagRow>(
    `INSERT INTO tags (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, slug, 0 AS photo_count`,
    [randomUUID(), parsed.name, slug]
  );

  return mapTagRow(result.rows[0]);
}

export async function updateTag(tagId: string, input: unknown) {
  const parsed = parseTagRequest(input);
  const slug = slugify(parsed.name);

  if (!slug) {
    throw new Error("Invalid tag name.");
  }

  const result = await query<TagRow>(
    `UPDATE tags
     SET name = $2, slug = $3
     WHERE id = $1
     RETURNING id, name, slug, 0 AS photo_count`,
    [tagId, parsed.name, slug]
  );

  if (!result.rows[0]) {
    throw new Error("Tag not found.");
  }

  return mapTagRow(result.rows[0]);
}

export async function deleteTag(tagId: string) {
  await query("DELETE FROM tags WHERE id = $1", [tagId]);
}
