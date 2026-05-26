import { describe, expect, it } from "vitest";

import { uploadPhotoFile } from "./photo-upload-client";

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
});
