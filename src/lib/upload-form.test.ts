import { describe, expect, it } from "vitest";

import {
  derivePhotoTitle,
  formatFileSize,
  getUploadValidationSummary,
  formatUploadSuccessMessage,
  formatUploadProgressMessage,
  parseTagInput,
  validateUploadFiles
} from "./upload-form";

describe("parseTagInput", () => {
  it("turns comma-separated tag text into a clean array", () => {
    expect(parseTagInput(" street, night, seoul ,, street ")).toEqual([
      "street",
      "night",
      "seoul"
    ]);
  });
});

describe("derivePhotoTitle", () => {
  it("uses the provided title for a single upload", () => {
    expect(
      derivePhotoTitle({
        title: "Euljiro Night",
        filename: "IMG_1234.jpg",
        totalFiles: 1
      })
    ).toBe("Euljiro Night");
  });

  it("uses a readable filename title when batch uploading without a shared title", () => {
    expect(
      derivePhotoTitle({
        title: "",
        filename: "IMG_1234.final.jpg",
        totalFiles: 3
      })
    ).toBe("IMG_1234.final");
  });

  it("adds the filename to a shared title during batch upload", () => {
    expect(
      derivePhotoTitle({
        title: "Seoul Walk",
        filename: "IMG_1234.jpg",
        totalFiles: 3
      })
    ).toBe("Seoul Walk - IMG_1234");
  });
});

describe("formatUploadProgressMessage", () => {
  it("names the current upload stage and file position", () => {
    expect(
      formatUploadProgressMessage({
        stage: "processing",
        filename: "IMG_1234.jpg",
        index: 1,
        totalFiles: 3
      })
    ).toBe("2/3 IMG_1234.jpg: Processing web images");
  });
});

describe("formatUploadSuccessMessage", () => {
  it("names the successful upload request stage", () => {
    expect(
      formatUploadSuccessMessage({
        stage: "metadata",
        filename: "IMG_1234.jpg"
      })
    ).toBe("IMG_1234.jpg: Metadata saved.");
  });
});

describe("formatFileSize", () => {
  it("formats bytes as readable file sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2 MB");
  });
});

describe("validateUploadFiles", () => {
  it("accepts allowed image files within the size limit", () => {
    expect(
      validateUploadFiles([
        {
          name: "photo.jpg",
          type: "image/jpeg",
          size: 1024
        }
      ])
    ).toEqual([
      {
        filename: "photo.jpg",
        valid: true,
        message: "Ready"
      }
    ]);
  });

  it("rejects unsupported image types and files larger than 10MB", () => {
    expect(
      validateUploadFiles([
        {
          name: "notes.txt",
          type: "text/plain",
          size: 1024
        },
        {
          name: "huge.jpg",
          type: "image/jpeg",
          size: 11 * 1024 * 1024
        }
      ])
    ).toEqual([
      {
        filename: "notes.txt",
        valid: false,
        message: "Unsupported image type."
      },
      {
        filename: "huge.jpg",
        valid: false,
        message: "Image must be 10MB or smaller."
      }
    ]);
  });
});

describe("getUploadValidationSummary", () => {
  it("returns a success toast message when every file is valid", () => {
    expect(
      getUploadValidationSummary([
        {
          filename: "photo.jpg",
          valid: true,
          message: "Ready"
        }
      ])
    ).toEqual({
      valid: true,
      tone: "success",
      message: "1 file ready to upload."
    });
  });

  it("returns an error toast message when a file is invalid", () => {
    expect(
      getUploadValidationSummary([
        {
          filename: "photo.jpg",
          valid: true,
          message: "Ready"
        },
        {
          filename: "notes.txt",
          valid: false,
          message: "Unsupported image type."
        }
      ])
    ).toEqual({
      valid: false,
      tone: "error",
      message: "notes.txt: Unsupported image type."
    });
  });
});
