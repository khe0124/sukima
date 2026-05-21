import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./photos";

export function parseTagInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

export function derivePhotoTitle({
  title,
  filename,
  totalFiles
}: {
  title: string;
  filename: string;
  totalFiles: number;
}) {
  const cleanTitle = title.trim();
  const fileTitle = filenameWithoutExtension(filename);

  if (totalFiles <= 1) return cleanTitle;
  if (!cleanTitle) return fileTitle;

  return `${cleanTitle} - ${fileTitle}`;
}

export type UploadProgressStage =
  | "upload-url"
  | "r2-upload"
  | "metadata"
  | "processing";

const uploadStageLabels: Record<UploadProgressStage, string> = {
  "upload-url": "Requesting upload URL",
  "r2-upload": "Uploading original",
  metadata: "Saving metadata",
  processing: "Processing web images"
};

const uploadSuccessLabels: Record<UploadProgressStage, string> = {
  "upload-url": "Upload URL created.",
  "r2-upload": "Original uploaded.",
  metadata: "Metadata saved.",
  processing: "Image processing complete."
};

export function formatUploadProgressMessage({
  stage,
  filename,
  index,
  totalFiles
}: {
  stage: UploadProgressStage;
  filename: string;
  index: number;
  totalFiles: number;
}) {
  return `${index + 1}/${totalFiles} ${filename}: ${uploadStageLabels[stage]}`;
}

export function formatUploadSuccessMessage({
  stage,
  filename
}: {
  stage: UploadProgressStage;
  filename: string;
}) {
  return `${filename}: ${uploadSuccessLabels[stage]}`;
}

export type UploadFileLike = {
  name: string;
  type: string;
  size: number;
};

export type UploadFileValidation = {
  filename: string;
  valid: boolean;
  message: string;
};

export type UploadValidationSummary = {
  valid: boolean;
  tone: "success" | "error";
  message: string;
};

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const kilobytes = size / 1024;
  if (kilobytes < 1024) {
    return `${Number(kilobytes.toFixed(1))} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${Number(megabytes.toFixed(1))} MB`;
}

export function validateUploadFiles(files: UploadFileLike[]): UploadFileValidation[] {
  return files.map((file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as never)) {
      return {
        filename: file.name,
        valid: false,
        message: "Unsupported image type."
      };
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        filename: file.name,
        valid: false,
        message: "Image must be 10MB or smaller."
      };
    }

    return {
      filename: file.name,
      valid: true,
      message: "Ready"
    };
  });
}

export function getUploadValidationSummary(validations: UploadFileValidation[]): UploadValidationSummary {
  const invalidFile = validations.find((validation) => !validation.valid);

  if (invalidFile) {
    return {
      valid: false,
      tone: "error",
      message: `${invalidFile.filename}: ${invalidFile.message}`
    };
  }

  return {
    valid: true,
    tone: "success",
    message: `${validations.length} file${validations.length === 1 ? "" : "s"} ready to upload.`
  };
}
