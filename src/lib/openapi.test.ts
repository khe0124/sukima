import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "./openapi";

describe("buildOpenApiDocument", () => {
  it("describes the photo upload, asset upload, and representative image update endpoints", () => {
    const document = buildOpenApiDocument();

    expect(document.openapi).toBe("3.1.0");
    expect(document.paths["/api/photos/upload-url"].post.summary).toContain("presigned upload URL");
    expect(document.paths["/api/photos/{id}/assets/upload-url"].post.responses["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/AssetUploadUrlResponse"
          }
        }
      }
    });
    expect(document.paths["/api/photos/{id}/assets"].post.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/PhotoAssetCreateRequest"
          }
        }
      }
    });
    expect(document.paths["/api/photos/{id}"].patch.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/PhotoUpdateRequest"
          }
        }
      }
    });
    expect(document.components.schemas.PhotoUpdateRequest).toMatchObject({
      properties: {
        primaryAssetId: expect.objectContaining({
          format: "uuid"
        })
      }
    });
  });

  it("does not document server-side R2 credentials", () => {
    const serialized = JSON.stringify(buildOpenApiDocument());

    expect(serialized).not.toContain("R2_SECRET_ACCESS_KEY");
    expect(serialized).not.toContain("R2_ACCESS_KEY_ID");
    expect(serialized).not.toContain("AUTH_SECRET");
  });
});
