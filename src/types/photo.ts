export type PhotoStatus = "pending" | "uploading" | "processing" | "ready" | "failed" | "deleted";
export type PhotoVisibility = "private" | "public" | "unlisted" | "draft";

export type PhotoListItem = {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  status?: PhotoStatus;
  visibility?: PhotoVisibility;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  blurUrl: string | null;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  uploadedAt?: string | null;
  tags: string[];
  collectionIds?: string[];
  assets?: PhotoAssetListItem[];
};

export type PhotoAssetListItem = {
  id: string;
  photoId: string;
  storageKeyOriginal?: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  blurUrl: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
};
