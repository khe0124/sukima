"use client";

import React from "react";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";

import { uploadPhotoSet } from "@/lib/photo-upload-client";
import {
  formatFileSize,
  formatUploadProgressMessage,
  formatUploadSuccessMessage,
  getUploadValidationSummary,
  parseTagInput,
  validateUploadFiles,
} from "@/lib/upload-form";
import type { CollectionListItem } from "@/server/collections";
import type { TagListItem } from "@/server/tags";
import {
  UPLOAD_FORM_DEFAULT_VALUES,
  UPLOAD_VISIBILITY_OPTIONS,
  type SelectedFilePreview,
  type UploadFormValues,
  type UploadResult,
} from "@/types/upload";

function getSubmittedFiles(
  selectedFiles: SelectedFilePreview[],
  value: UploadFormValues["files"],
) {
  if (selectedFiles.length > 0) {
    return selectedFiles.map((item) => item.file);
  }

  if (!value) return [];

  return Array.from(value).filter(
    (file): file is File => file instanceof File && file.size > 0,
  );
}

function buildFilePreviews(files: File[]): SelectedFilePreview[] {
  const validations = validateUploadFiles(files);

  return files.map((file, index) => ({
    file,
    previewUrl:
      file.type.startsWith("image/") &&
      !file.type.includes("heic") &&
      !file.type.includes("heif")
        ? URL.createObjectURL(file)
        : null,
    valid: validations[index].valid,
    message: validations[index].message,
  }));
}

export default function UploadPageClient({
  collections = [],
  tags: availableTags = []
}: {
  collections?: CollectionListItem[];
  tags?: TagListItem[];
}) {
  const [status, setStatus] = useState("Ready");
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFilePreview[]>([]);
  const [representativeIndex, setRepresentativeIndex] = useState(0);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<UploadFormValues>({
    defaultValues: UPLOAD_FORM_DEFAULT_VALUES,
  });

  const filesField = register("files");

  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [selectedFiles]);

  function updateSelectedFiles(files: File[]) {
    const nextSelectedFiles = buildFilePreviews(files);

    setSelectedFiles(nextSelectedFiles);
    setResults([]);
    setRepresentativeIndex(0);

    if (files.length === 0) {
      setStatus("Ready");
      return;
    }

    const validationSummary = getUploadValidationSummary(
      validateUploadFiles(files),
    );
    setStatus(
      validationSummary.valid
        ? `${files.length} file${files.length === 1 ? "" : "s"} selected.`
        : validationSummary.message,
    );
    toast[validationSummary.tone](validationSummary.message);
  }

  function updateResult(
    filename: string,
    result: Omit<UploadResult, "filename">,
  ) {
    setResults((current) =>
      current.map((item) =>
        item.filename === filename ? { ...item, ...result } : item,
      ),
    );
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    updateSelectedFiles(Array.from(event.currentTarget.files || []));
    filesField.onChange(event);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isSubmitting) return;

    const files = Array.from(event.dataTransfer.files);
    updateSelectedFiles(files);
    setValue("files", files, { shouldDirty: true, shouldValidate: true });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadFromForm(form: UploadFormValues) {
    try {
      setStatus("Checking files...");
      toast.info("Checking upload...");

      const files = getSubmittedFiles(selectedFiles, form.files);

      if (files.length === 0) {
        setStatus("Choose at least one image.");
        toast.error("Choose at least one image.");
        return;
      }

      const validations = validateUploadFiles(files);
      const validationSummary = getUploadValidationSummary(validations);
      toast[validationSummary.tone](validationSummary.message);

      const invalidFiles = validations.filter(
        (validation) => !validation.valid,
      );
      if (invalidFiles.length > 0) {
        setResults(
          validations.map((validation) => ({
            filename: validation.filename,
            status: validation.valid ? "pending" : "failed",
            message: validation.message,
          })),
        );
        setStatus("Fix invalid files before uploading.");
        return;
      }

      const tags = Array.from(new Set([...selectedTags, ...parseTagInput(form.tags)]));
      const nextResults: UploadResult[] = [];

      toast.info(
        `Uploading ${files.length} file${files.length === 1 ? "" : "s"}...`,
      );
      setResults(
        files.map((file) => ({
          filename: file.name,
          status: "pending",
          message: "Waiting",
        })),
      );

      try {
        const uploadResults = await uploadPhotoSet({
          files,
          representativeIndex: Math.min(representativeIndex, files.length - 1),
          title: form.title,
          description: form.description,
          takenAtValue: form.takenAt,
          tags,
          visibility: form.visibility,
          collectionIds: selectedCollectionIds,
          onStage: (filename, stage, index) => {
              const message = formatUploadProgressMessage({
                stage,
              filename,
                index,
                totalFiles: files.length,
              });
              setStatus(message);
            updateResult(filename, { status: "working", message });
            },
          onStageSuccess: (filename, stage) => {
              toast.success(
              formatUploadSuccessMessage({ filename, stage }),
              );
            },
          });
        nextResults.push(...uploadResults);
        for (const result of uploadResults) {
          updateResult(result.filename, { status: "done", message: "Ready" });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed.";
        toast.error(message);
        nextResults.push(
          ...files.map((file) => ({
            filename: file.name,
            status: "failed" as const,
            message,
          })),
        );
        for (const file of files) {
          updateResult(file.name, { status: "failed", message });
        }
      }

      const failedCount = nextResults.filter(
        (result) => result.status === "failed",
      ).length;
      setStatus(
        failedCount === 0
          ? `Uploaded and processed ${nextResults.length} file${nextResults.length === 1 ? "" : "s"}.`
          : `Uploaded ${nextResults.length - failedCount} of ${nextResults.length} files.`,
      );
      toast[failedCount === 0 ? "success" : "error"](
        failedCount === 0
          ? `Uploaded ${nextResults.length} file${nextResults.length === 1 ? "" : "s"}.`
          : `${failedCount} upload${failedCount === 1 ? "" : "s"} failed.`,
      );

      if (failedCount === 0) {
        setSelectedFiles([]);
        setSelectedCollectionIds([]);
        setSelectedTags([]);
        setRepresentativeIndex(0);
        reset(UPLOAD_FORM_DEFAULT_VALUES);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Upload failed before it could start.";
      setStatus(message);
      toast.error(message);
    }
  }

  const submitUpload = handleSubmit(uploadFromForm, (errors) => {
    console.error("[upload] validation failed", errors);
  });

  function runUpload(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) return;
    void submitUpload(event);
  }

  return (
    <main className="shell">
      <section className="page-heading">
        <p className="eyebrow">Admin</p>
        <h1>Upload Photo</h1>
        <p>
          Uploads the private original to R2 and records metadata in Postgres.
        </p>
      </section>

      <form
        className="upload-form"
        noValidate
        onSubmit={runUpload}
      >
        <label
          className="dropzone"
          data-dragging={isDragging}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isSubmitting) setIsDragging(true);
          }}
          onDrop={handleDrop}
        >
          <span>Images</span>
          <strong>Drop images here or click to choose</strong>
          <small>JPEG, PNG, WebP, HEIC, or HEIF. Maximum 10MB each.</small>
          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={isSubmitting}
            multiple
            onChange={handleFileChange}
            name={filesField.name}
            onBlur={filesField.onBlur}
            ref={(element) => {
              filesField.ref(element);
              fileInputRef.current = element;
            }}
            type="file"
          />
        </label>

        {selectedFiles.length > 0 ? (
          <ul className="upload-preview-grid" aria-label="Selected images">
            {selectedFiles.map((item, index) => (
              <li
                key={`${item.file.name}-${item.file.size}-${item.file.lastModified}`}
                data-valid={item.valid}
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={item.previewUrl} />
                ) : (
                  <span className="upload-file-fallback">No preview</span>
                )}
                <div>
                  <strong>{item.file.name}</strong>
                  <span>
                    {formatFileSize(item.file.size)} · {item.message}
                  </span>
                  <label className="representative-choice">
                    <input
                      checked={representativeIndex === index}
                      name="representativeIndex"
                      onChange={() => setRepresentativeIndex(index)}
                      type="radio"
                    />
                    Representative
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <label>
          Title
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <input {...field} type="text" maxLength={160} />
            )}
          />
        </label>
        <label>
          Description
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea {...field} rows={4} maxLength={2000} />
            )}
          />
        </label>
        <label>
          Taken at
          <Controller
            name="takenAt"
            control={control}
            render={({ field }) => <input {...field} type="datetime-local" />}
          />
        </label>
        <label>
          Tags
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                placeholder="street, night, seoul"
              />
            )}
          />
        </label>
        {availableTags.length > 0 ? (
          <details className="check-menu">
            <summary>Existing tags ({selectedTags.length})</summary>
            <div>
              {availableTags.map((tag) => (
                <label key={tag.id}>
                  <input
                    checked={selectedTags.includes(tag.name)}
                    onChange={(event) => {
                      setSelectedTags((current) =>
                        event.currentTarget.checked
                          ? [...current, tag.name]
                          : current.filter((name) => name !== tag.name),
                      );
                    }}
                    type="checkbox"
                  />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          </details>
        ) : null}
        {collections.length > 0 ? (
          <fieldset className="visibility-control">
            <legend>Collections</legend>
            <div>
              {collections.map((collection) => (
                <label key={collection.id}>
                  <input
                    checked={selectedCollectionIds.includes(collection.id)}
                    onChange={(event) => {
                      setSelectedCollectionIds((current) =>
                        event.currentTarget.checked
                          ? [...current, collection.id]
                          : current.filter((id) => id !== collection.id),
                      );
                    }}
                    type="checkbox"
                  />
                  <span>{collection.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <fieldset className="visibility-control">
          <legend>Visibility</legend>
          <Controller
            name="visibility"
            control={control}
            render={({ field: { name, onBlur, onChange, value } }) => (
              <div>
                {UPLOAD_VISIBILITY_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      checked={value === option.value}
                      name={name}
                      onBlur={onBlur}
                      onChange={() => onChange(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </fieldset>

        <button aria-busy={isSubmitting} disabled={isSubmitting} type="submit">
          {isSubmitting ? "Uploading..." : "Upload"}
        </button>
        <p role="status">
          {status}
          {isSubmitting ? " (submitting)" : ""}
        </p>

        {results.length > 0 ? (
          <ul className="upload-results" aria-label="Upload results">
            {results.map((result) => (
              <li key={result.filename} data-status={result.status}>
                <span>{result.filename}</span>
                <strong>{result.message}</strong>
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <ToastContainer
        position="top-right"
        autoClose={4500}
        hideProgressBar
        newestOnTop
      />
    </main>
  );
}
