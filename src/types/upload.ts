import type { PhotoVisibility } from "@/types/photo";

export type UploadResultStatus = "pending" | "working" | "done" | "failed";

export type UploadResult = {
  filename: string;
  status: UploadResultStatus;
  message: string;
};

export type SelectedFilePreview = {
  file: File;
  previewUrl: string | null;
  valid: boolean;
  message: string;
};

export type UploadFormValues = {
  files: FileList | File[] | null;
  title: string;
  description: string;
  takenAt: string;
  tags: string;
  visibility: PhotoVisibility;
};

export const UPLOAD_VISIBILITY_OPTIONS: {
  value: PhotoVisibility;
  label: string;
}[] = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
  { value: "draft", label: "Draft" },
];

export const UPLOAD_FORM_DEFAULT_VALUES: UploadFormValues = {
  files: null,
  title: "",
  description: "",
  takenAt: "",
  tags: "",
  visibility: "private",
};
