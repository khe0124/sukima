import { derivePhotoTitle, type UploadProgressStage } from "./upload-form";

type UploadUrlResponse = {
  uploadUrl: string;
  photoId: string;
  storageKeyOriginal: string;
};

type AssetUploadUrlResponse = {
  uploadUrl: string;
  assetId: string;
  storageKeyOriginal: string;
};

type UploadResult = {
  filename: string;
  status: "done";
  message: "Ready";
};

type UploadStageHandler = (stage: UploadProgressStage) => void;

type UploadSuccessHandler = (stage: UploadProgressStage) => void;

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

async function readJsonError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

function readXmlTag(text: string, tagName: string) {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`).exec(text);
  return match?.[1]?.trim() || null;
}

async function readR2UploadError(response: Response) {
  const fallback = `R2 upload failed with ${response.status}.`;

  try {
    const text = await response.text();
    const code = readXmlTag(text, "Code");
    const message = readXmlTag(text, "Message");

    if (code && message) {
      return `R2 upload failed with ${response.status}: ${code} - ${message}`;
    }

    if (code) {
      return `R2 upload failed with ${response.status}: ${code}`;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export async function uploadPhotoFile({
  file,
  commonTitle,
  description,
  takenAtValue,
  tags,
  visibility,
  totalFiles,
  onStage,
  onStageSuccess,
  fetcher = fetch
}: {
  file: File;
  commonTitle: string;
  description: string;
  takenAtValue: string;
  tags: string[];
  visibility: string;
  totalFiles: number;
  onStage?: UploadStageHandler;
  onStageSuccess?: UploadSuccessHandler;
  fetcher?: Fetcher;
}): Promise<UploadResult> {
  const jsonHeaders = {
    "content-type": "application/json"
  };

  onStage?.("upload-url");
  const uploadUrlResponse = await fetcher("/api/photos/upload-url", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size
    })
  });

  if (!uploadUrlResponse.ok) {
    throw new Error(await readJsonError(uploadUrlResponse, "Upload URL request failed."));
  }

  const uploadUrl = (await uploadUrlResponse.json()) as UploadUrlResponse;
  onStageSuccess?.("upload-url");

  onStage?.("r2-upload");
  const r2Response = await fetcher(uploadUrl.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type
    },
    body: file
  });

  if (!r2Response.ok) {
    throw new Error(await readR2UploadError(r2Response));
  }
  onStageSuccess?.("r2-upload");

  onStage?.("metadata");
  const createResponse = await fetcher("/api/photos", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      photoId: uploadUrl.photoId,
      storageKeyOriginal: uploadUrl.storageKeyOriginal,
      title: derivePhotoTitle({
        title: commonTitle,
        filename: file.name,
        totalFiles
      }),
      description,
      takenAt: takenAtValue ? new Date(takenAtValue).toISOString() : "",
      tags,
      visibility,
      fileSize: file.size,
      mimeType: file.type
    })
  });

  if (!createResponse.ok) {
    throw new Error(await readJsonError(createResponse, "Metadata save failed."));
  }
  onStageSuccess?.("metadata");

  onStage?.("processing");
  const processResponse = await fetcher(`/api/photos/${uploadUrl.photoId}/process`, {
    method: "POST"
  });

  if (!processResponse.ok) {
    throw new Error(await readJsonError(processResponse, "Image processing failed."));
  }
  onStageSuccess?.("processing");

  return {
    filename: file.name,
    status: "done",
    message: "Ready"
  };
}

export async function uploadPhotoSet({
  files,
  representativeIndex,
  title,
  description,
  takenAtValue,
  tags,
  visibility,
  collectionIds,
  onStage,
  onStageSuccess,
  fetcher = fetch
}: {
  files: File[];
  representativeIndex: number;
  title: string;
  description: string;
  takenAtValue: string;
  tags: string[];
  visibility: string;
  collectionIds: string[];
  onStage?: (filename: string, stage: UploadProgressStage, index: number) => void;
  onStageSuccess?: (filename: string, stage: UploadProgressStage) => void;
  fetcher?: Fetcher;
}): Promise<UploadResult[]> {
  if (files.length === 0) {
    throw new Error("Choose at least one image.");
  }

  const jsonHeaders = {
    "content-type": "application/json"
  };
  const uploadResults: Array<{ file: File; upload: UploadUrlResponse; isPrimary: boolean; sortOrder: number }> = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onStage?.(file.name, "upload-url", index);
    const uploadUrlResponse = await fetcher("/api/photos/upload-url", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size
      })
    });

    if (!uploadUrlResponse.ok) {
      throw new Error(await readJsonError(uploadUrlResponse, "Upload URL request failed."));
    }

    const upload = (await uploadUrlResponse.json()) as UploadUrlResponse;
    onStageSuccess?.(file.name, "upload-url");

    onStage?.(file.name, "r2-upload", index);
    const r2Response = await fetcher(upload.uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": file.type
      },
      body: file
    });

    if (!r2Response.ok) {
      throw new Error(await readR2UploadError(r2Response));
    }
    onStageSuccess?.(file.name, "r2-upload");

    uploadResults.push({
      file,
      upload,
      isPrimary: index === representativeIndex,
      sortOrder: index
    });
  }

  const primary = uploadResults.find((result) => result.isPrimary) ?? uploadResults[0];
  onStage?.(primary.file.name, "metadata", representativeIndex);
  const createResponse = await fetcher("/api/photos", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      photoId: primary.upload.photoId,
      storageKeyOriginal: primary.upload.storageKeyOriginal,
      title: title || derivePhotoTitle({
        title,
        filename: primary.file.name,
        totalFiles: 1
      }),
      description,
      takenAt: takenAtValue ? new Date(takenAtValue).toISOString() : "",
      tags,
      visibility,
      collectionIds,
      fileSize: primary.file.size,
      mimeType: primary.file.type,
      assets: uploadResults.map((result) => ({
        storageKeyOriginal: result.upload.storageKeyOriginal,
        fileSize: result.file.size,
        mimeType: result.file.type,
        sortOrder: result.sortOrder,
        isPrimary: result.isPrimary
      }))
    })
  });

  if (!createResponse.ok) {
    throw new Error(await readJsonError(createResponse, "Metadata save failed."));
  }
  onStageSuccess?.(primary.file.name, "metadata");

  onStage?.(primary.file.name, "processing", representativeIndex);
  const processResponse = await fetcher(`/api/photos/${primary.upload.photoId}/process`, {
    method: "POST"
  });

  if (!processResponse.ok) {
    throw new Error(await readJsonError(processResponse, "Image processing failed."));
  }
  onStageSuccess?.(primary.file.name, "processing");

  return files.map((file) => ({
    filename: file.name,
    status: "done",
    message: "Ready"
  }));
}

export async function uploadPhotoAssets({
  photoId,
  files,
  onStage,
  onStageSuccess,
  fetcher = fetch
}: {
  photoId: string;
  files: File[];
  onStage?: (filename: string, stage: UploadProgressStage, index: number) => void;
  onStageSuccess?: (filename: string, stage: UploadProgressStage) => void;
  fetcher?: Fetcher;
}): Promise<UploadResult[]> {
  if (files.length === 0) {
    throw new Error("Choose at least one image.");
  }

  const jsonHeaders = {
    "content-type": "application/json"
  };

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    onStage?.(file.name, "upload-url", index);
    const uploadUrlResponse = await fetcher(`/api/photos/${photoId}/assets/upload-url`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size
      })
    });

    if (!uploadUrlResponse.ok) {
      throw new Error(await readJsonError(uploadUrlResponse, "Upload URL request failed."));
    }

    const upload = (await uploadUrlResponse.json()) as AssetUploadUrlResponse;
    onStageSuccess?.(file.name, "upload-url");

    onStage?.(file.name, "r2-upload", index);
    const r2Response = await fetcher(upload.uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": file.type
      },
      body: file
    });

    if (!r2Response.ok) {
      throw new Error(await readR2UploadError(r2Response));
    }
    onStageSuccess?.(file.name, "r2-upload");

    onStage?.(file.name, "metadata", index);
    const assetResponse = await fetcher(`/api/photos/${photoId}/assets`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        assetId: upload.assetId,
        storageKeyOriginal: upload.storageKeyOriginal,
        fileSize: file.size,
        mimeType: file.type
      })
    });

    if (!assetResponse.ok) {
      throw new Error(await readJsonError(assetResponse, "Asset metadata save failed."));
    }
    onStageSuccess?.(file.name, "metadata");
  }

  onStage?.(files[0].name, "processing", 0);
  const processResponse = await fetcher(`/api/photos/${photoId}/process`, {
    method: "POST"
  });

  if (!processResponse.ok) {
    throw new Error(await readJsonError(processResponse, "Image processing failed."));
  }
  onStageSuccess?.(files[0].name, "processing");

  return files.map((file) => ({
    filename: file.name,
    status: "done",
    message: "Ready"
  }));
}
