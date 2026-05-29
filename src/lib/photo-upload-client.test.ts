import { describe, expect, it } from "vitest";

import { uploadPhotoAssets, uploadPhotoFile, uploadPhotoSet } from "./photo-upload-client";

describe("uploadPhotoFile", () => {
  it("uses the expected presigned upload request sequence", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });

      if (url === "/api/photos/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/upload",
          photoId: "photo-1",
          storageKeyOriginal: "private/originals/2026/05/21/photo-1-original.jpg"
        });
      }

      return Response.json({ ok: true }, { status: 200 });
    };

    const result = await uploadPhotoFile({
      file: {
        name: "PICT0803.jpg",
        type: "image/jpeg",
        size: 265279
      } as File,
      commonTitle: "Water",
      description: "",
      takenAtValue: "",
      tags: ["water"],
      visibility: "private",
      totalFiles: 1,
      fetcher
    });

    expect(result).toEqual({
      filename: "PICT0803.jpg",
      status: "done",
      message: "Ready"
    });
    expect(calls.map((call) => [call.url, call.init.method])).toEqual([
      ["/api/photos/upload-url", "POST"],
      ["https://r2.example/upload", "PUT"],
      ["/api/photos", "POST"],
      ["/api/photos/photo-1/process", "POST"]
    ]);
  });

  it("reports metadata save success after the photo creation POST succeeds", async () => {
    const completedStages: string[] = [];
    const fetcher = async (url: string, init: RequestInit = {}) => {
      if (url === "/api/photos/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/upload",
          photoId: "photo-1",
          storageKeyOriginal: "private/originals/2026/05/21/photo-1-original.jpg"
        });
      }

      return Response.json({ ok: true }, { status: init.method === "POST" ? 201 : 200 });
    };

    await uploadPhotoFile({
      file: {
        name: "PICT0803.jpg",
        type: "image/jpeg",
        size: 265279
      } as File,
      commonTitle: "Water",
      description: "",
      takenAtValue: "",
      tags: ["water"],
      visibility: "private",
      totalFiles: 1,
      fetcher,
      onStageSuccess: (stage) => completedStages.push(stage)
    });

    expect(completedStages).toContain("metadata");
  });

  it("throws the API error when the photo creation POST fails", async () => {
    const fetcher = async (url: string) => {
      if (url === "/api/photos/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/upload",
          photoId: "photo-1",
          storageKeyOriginal: "private/originals/2026/05/21/photo-1-original.jpg"
        });
      }

      if (url === "/api/photos") {
        return Response.json({ error: "Metadata rejected." }, { status: 400 });
      }

      return Response.json({ ok: true }, { status: 200 });
    };

    await expect(
      uploadPhotoFile({
        file: {
          name: "PICT0803.jpg",
          type: "image/jpeg",
          size: 265279
        } as File,
        commonTitle: "Water",
        description: "",
        takenAtValue: "",
        tags: ["water"],
        visibility: "private",
        totalFiles: 1,
        fetcher
      })
    ).rejects.toThrow("Metadata rejected.");
  });

  it("includes the R2 error code and message when the direct upload fails", async () => {
    const fetcher = async (url: string) => {
      if (url === "/api/photos/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/upload",
          photoId: "photo-1",
          storageKeyOriginal: "private/originals/2026/05/21/photo-1-original.jpg"
        });
      }

      return new Response(
        `<Error>
          <Code>SignatureDoesNotMatch</Code>
          <Message>The request signature we calculated does not match.</Message>
        </Error>`,
        {
          status: 403,
          headers: {
            "content-type": "application/xml"
          }
        }
      );
    };

    await expect(
      uploadPhotoFile({
        file: {
          name: "PICT0803.jpg",
          type: "image/jpeg",
          size: 265279
        } as File,
        commonTitle: "Water",
        description: "",
        takenAtValue: "",
        tags: ["water"],
        visibility: "private",
        totalFiles: 1,
        fetcher
      })
    ).rejects.toThrow(
      "R2 upload failed with 403: SignatureDoesNotMatch - The request signature we calculated does not match."
    );
  });

  it("uploads a photo set as one metadata record with selected representative and assets", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });

      if (url === "/api/photos/upload-url") {
        const body = JSON.parse(String(init.body)) as { filename: string };
        const id = body.filename.includes("cover") ? "cover-id" : "detail-id";

        return Response.json({
          uploadUrl: `https://r2.example/${id}`,
          photoId: id,
          storageKeyOriginal: `private/originals/2026/05/21/${id}-original.jpg`
        });
      }

      return Response.json({ ok: true }, { status: init.method === "POST" ? 201 : 200 });
    };

    await uploadPhotoSet({
      files: [
        {
          name: "detail.jpg",
          type: "image/jpeg",
          size: 100
        } as File,
        {
          name: "cover.jpg",
          type: "image/jpeg",
          size: 200
        } as File
      ],
      representativeIndex: 1,
      title: "Photo Set",
      description: "",
      takenAtValue: "",
      tags: ["street"],
      visibility: "public",
      collectionIds: ["550e8400-e29b-41d4-a716-446655440000"],
      fetcher
    });

    const metadataCall = calls.find((call) => call.url === "/api/photos");
    expect(metadataCall).toBeTruthy();
    expect(JSON.parse(String(metadataCall?.init.body))).toMatchObject({
      photoId: "cover-id",
      storageKeyOriginal: "private/originals/2026/05/21/cover-id-original.jpg",
      title: "Photo Set",
      collectionIds: ["550e8400-e29b-41d4-a716-446655440000"],
      assets: [
        {
          storageKeyOriginal: "private/originals/2026/05/21/detail-id-original.jpg",
          sortOrder: 0,
          isPrimary: false
        },
        {
          storageKeyOriginal: "private/originals/2026/05/21/cover-id-original.jpg",
          sortOrder: 1,
          isPrimary: true
        }
      ]
    });
  });

  it("throws a clear error when uploading an empty photo set", async () => {
    await expect(
      uploadPhotoSet({
        files: [],
        representativeIndex: 0,
        title: "",
        description: "",
        takenAtValue: "",
        tags: [],
        visibility: "private",
        collectionIds: []
      })
    ).rejects.toThrow("Choose at least one image.");
  });
});

describe("uploadPhotoAssets", () => {
  it("uploads additional images to an existing photo and reprocesses it", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });

      if (url === "/api/photos/550e8400-e29b-41d4-a716-446655440000/assets/upload-url") {
        return Response.json({
          uploadUrl: "https://r2.example/asset-id",
          assetId: "660e8400-e29b-41d4-a716-446655440000",
          storageKeyOriginal: "private/originals/2026/05/26/660e8400-e29b-41d4-a716-446655440000-original.jpg"
        });
      }

      return Response.json({ ok: true }, { status: init.method === "POST" ? 201 : 200 });
    };

    await uploadPhotoAssets({
      photoId: "550e8400-e29b-41d4-a716-446655440000",
      files: [
        {
          name: "detail.jpg",
          type: "image/jpeg",
          size: 300
        } as File
      ],
      fetcher
    });

    expect(calls.map((call) => [call.url, call.init.method])).toEqual([
      ["/api/photos/550e8400-e29b-41d4-a716-446655440000/assets/upload-url", "POST"],
      ["https://r2.example/asset-id", "PUT"],
      ["/api/photos/550e8400-e29b-41d4-a716-446655440000/assets", "POST"],
      ["/api/photos/550e8400-e29b-41d4-a716-446655440000/process", "POST"]
    ]);

    const assetCall = calls.find(
      (call) => call.url === "/api/photos/550e8400-e29b-41d4-a716-446655440000/assets"
    );
    expect(JSON.parse(String(assetCall?.init.body))).toEqual({
      assetId: "660e8400-e29b-41d4-a716-446655440000",
      storageKeyOriginal: "private/originals/2026/05/26/660e8400-e29b-41d4-a716-446655440000-original.jpg",
      fileSize: 300,
      mimeType: "image/jpeg"
    });
  });

  it("throws a clear error when no additional files are selected", async () => {
    await expect(
      uploadPhotoAssets({
        photoId: "550e8400-e29b-41d4-a716-446655440000",
        files: []
      })
    ).rejects.toThrow("Choose at least one image.");
  });
});
