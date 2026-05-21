import { derivePhotoTitle, type UploadProgressStage } from "./upload-form";

type UploadUrlResponse = {
  uploadUrl: string;
  photoId: string;
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
    throw new Error("R2 upload failed.");
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
