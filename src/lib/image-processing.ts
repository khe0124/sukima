import sharp from "sharp";

export type ProcessedImageName = "large" | "medium" | "thumbnail" | "blur";

export type ProcessedStorageKeys = Record<ProcessedImageName, string>;

export function getResizePlan() {
  return [
    { name: "large" as const, width: 1920, quality: 82 },
    { name: "medium" as const, width: 1200, quality: 80 },
    { name: "thumbnail" as const, width: 400, quality: 76 },
    { name: "blur" as const, width: 20, quality: 45 }
  ];
}

export function buildProcessedStorageKeys(originalStorageKey: string): ProcessedStorageKeys {
  const match = originalStorageKey.match(
    /^private\/originals\/(\d{4})\/(\d{2})\/(\d{2})\/(.+)-original\.[a-z0-9]+$/i
  );

  if (!match) {
    throw new Error("Invalid original storage key.");
  }

  const [, year, month, day, photoId] = match;
  const base = `public/photos/${year}/${month}/${day}/${photoId}`;

  return {
    large: `${base}-large.webp`,
    medium: `${base}-medium.webp`,
    thumbnail: `${base}-thumb.webp`,
    blur: `${base}-blur.webp`
  };
}

export async function generateProcessedImages(input: Buffer) {
  const metadata = await sharp(input).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  const variants = await Promise.all(
    getResizePlan().map(async (variant) => ({
      name: variant.name,
      buffer: await sharp(input)
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: variant.quality })
        .toBuffer()
    }))
  );

  return {
    width,
    height,
    variants
  };
}
