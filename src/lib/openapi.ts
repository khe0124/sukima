import { getSiteName, getSiteUrl } from "@/lib/seo";

type OpenApiSchema = Record<string, unknown>;

type OpenApiOperation = {
  summary: string;
  description?: string;
  tags: string[];
  security?: { AdminSessionCookie: never[] }[];
  requestBody?: OpenApiSchema;
  parameters?: OpenApiSchema[];
  responses: Record<string, OpenApiSchema>;
};

export type OpenApiDocument = {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: { url: string }[];
  tags: { name: string; description: string }[];
  components: {
    securitySchemes: Record<string, OpenApiSchema>;
    schemas: Record<string, OpenApiSchema>;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
};

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" }
        }
      }
    }
  }
};

const okResponse = {
  description: "Success response",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          ok: { type: "boolean" }
        }
      }
    }
  }
};

const jsonRequest = (schema: OpenApiSchema) => ({
  required: true,
  content: {
    "application/json": {
      schema
    }
  }
});

const idParameter = (name = "id") => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" }
});

const slugParameter = {
  name: "slug",
  in: "path",
  required: true,
  schema: { type: "string" }
};

function operation({
  summary,
  description,
  tags,
  requestBody,
  parameters,
  responses
}: Omit<OpenApiOperation, "security">): OpenApiOperation {
  return {
    summary,
    description,
    tags,
    security: [{ AdminSessionCookie: [] }],
    requestBody,
    parameters,
    responses
  };
}

export function buildOpenApiDocument(): OpenApiDocument {
  const siteUrl = getSiteUrl();

  return {
    openapi: "3.1.0",
    info: {
      title: `${getSiteName()} API`,
      version: "0.1.0",
      description:
        "Swagger-compatible OpenAPI document for the private photo archive API. Admin routes require the admin session cookie."
    },
    servers: [{ url: siteUrl }],
    tags: [
      { name: "Photos", description: "Photo upload, listing, editing, processing, and original download URLs." },
      { name: "Tags", description: "Tag listing and management." },
      { name: "Collections", description: "Collection listing, editing, and photo membership management." },
      { name: "Admin", description: "Admin authentication endpoints." }
    ],
    components: {
      securitySchemes: {
        AdminSessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "admin_session"
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string" }
          }
        },
        UploadUrlRequest: {
          type: "object",
          required: ["filename", "contentType", "size"],
          properties: {
            filename: { type: "string", example: "IMG_1234.jpg" },
            contentType: {
              type: "string",
              enum: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
            },
            size: { type: "integer", minimum: 1, maximum: 10485760 }
          }
        },
        UploadUrlResponse: {
          type: "object",
          required: ["uploadUrl", "photoId", "storageKeyOriginal"],
          properties: {
            uploadUrl: { type: "string", format: "uri", description: "Short-lived presigned R2 upload URL." },
            photoId: { type: "string", format: "uuid" },
            storageKeyOriginal: {
              type: "string",
              description: "Private original storage key. Server-side/admin use only."
            }
          }
        },
        AssetUploadUrlResponse: {
          type: "object",
          required: ["uploadUrl", "assetId", "storageKeyOriginal"],
          properties: {
            uploadUrl: { type: "string", format: "uri", description: "Short-lived presigned R2 upload URL." },
            assetId: { type: "string", format: "uuid" },
            storageKeyOriginal: {
              type: "string",
              description: "Private original storage key for the new asset. Server-side/admin use only."
            }
          }
        },
        PhotoAssetCreateRequest: {
          type: "object",
          required: ["assetId", "storageKeyOriginal"],
          properties: {
            assetId: { type: "string", format: "uuid" },
            storageKeyOriginal: { type: "string", description: "Private original storage key returned by asset upload-url." },
            fileSize: { type: "integer", minimum: 1 },
            mimeType: { type: "string" }
          }
        },
        PhotoAsset: {
          type: "object",
          required: ["id", "photoId", "thumbnailUrl", "mediumUrl", "largeUrl", "isPrimary"],
          properties: {
            id: { type: "string", format: "uuid" },
            photoId: { type: "string", format: "uuid" },
            thumbnailUrl: { type: ["string", "null"], format: "uri" },
            mediumUrl: { type: ["string", "null"], format: "uri" },
            largeUrl: { type: ["string", "null"], format: "uri" },
            width: { type: ["integer", "null"] },
            height: { type: ["integer", "null"] },
            sortOrder: { type: "integer" },
            isPrimary: { type: "boolean" }
          }
        },
        Photo: {
          type: "object",
          required: ["id", "thumbnailUrl", "mediumUrl", "largeUrl", "tags"],
          properties: {
            id: { type: "string" },
            title: { type: ["string", "null"] },
            slug: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            status: { type: "string", enum: ["pending", "uploading", "processing", "ready", "failed", "deleted"] },
            visibility: { type: "string", enum: ["private", "public", "unlisted", "draft"] },
            thumbnailUrl: { type: ["string", "null"], format: "uri" },
            mediumUrl: { type: ["string", "null"], format: "uri" },
            largeUrl: { type: ["string", "null"], format: "uri" },
            width: { type: ["integer", "null"] },
            height: { type: ["integer", "null"] },
            takenAt: { type: ["string", "null"], format: "date-time" },
            tags: { type: "array", items: { type: "string" } }
          }
        },
        PhotoCreateRequest: {
          type: "object",
          required: ["photoId", "storageKeyOriginal"],
          properties: {
            photoId: { type: "string", format: "uuid" },
            storageKeyOriginal: { type: "string", description: "Private original storage key returned by upload-url." },
            title: { type: "string", maxLength: 160 },
            description: { type: "string", maxLength: 2000 },
            takenAt: { type: "string", format: "date-time" },
            tags: { type: "array", maxItems: 20, items: { type: "string", maxLength: 40 } },
            visibility: { type: "string", enum: ["private", "public", "unlisted", "draft"] },
            assets: {
              type: "array",
              maxItems: 100,
              items: {
                type: "object",
                required: ["storageKeyOriginal"],
                properties: {
                  storageKeyOriginal: { type: "string" },
                  fileSize: { type: "integer", minimum: 1 },
                  mimeType: { type: "string" },
                  sortOrder: { type: "integer", minimum: 0 },
                  isPrimary: { type: "boolean" }
                }
              }
            },
            collectionIds: { type: "array", maxItems: 20, items: { type: "string", format: "uuid" } }
          }
        },
        PhotoUpdateRequest: {
          type: "object",
          properties: {
            title: { type: "string", maxLength: 160 },
            description: { type: "string", maxLength: 2000 },
            takenAt: { type: "string", format: "date-time" },
            tags: { type: "array", maxItems: 20, items: { type: "string", maxLength: 40 } },
            visibility: { type: "string", enum: ["private", "public", "unlisted", "draft"] },
            collectionIds: { type: "array", maxItems: 20, items: { type: "string", format: "uuid" } },
            primaryAssetId: {
              type: "string",
              format: "uuid",
              description: "Photo asset id to set as the representative image."
            }
          }
        },
        Tag: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            photoCount: { type: "integer" }
          }
        },
        Collection: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            slug: { type: "string" },
            description: { type: ["string", "null"] },
            visibility: { type: "string", enum: ["private", "public", "unlisted", "draft"] },
            coverPhotoId: { type: ["string", "null"] },
            photoCount: { type: "integer" }
          }
        }
      }
    },
    paths: {
      "/api/photos/upload-url": {
        post: operation({
          tags: ["Photos"],
          summary: "Create a presigned upload URL for a private original.",
          requestBody: jsonRequest({ $ref: "#/components/schemas/UploadUrlRequest" }),
          responses: {
            "200": {
              description: "Presigned upload URL",
              content: { "application/json": { schema: { $ref: "#/components/schemas/UploadUrlResponse" } } }
            },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse
          }
        })
      },
      "/api/photos": {
        get: operation({
          tags: ["Photos"],
          summary: "List photos with cursor pagination.",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 30, maximum: 100 } },
            { name: "cursor", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "visibility", in: "query", schema: { type: "string" } },
            { name: "sort", in: "query", schema: { type: "string" } }
          ],
          responses: {
            "200": {
              description: "Paginated photo list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: { $ref: "#/components/schemas/Photo" } },
                      nextCursor: { type: ["string", "null"] }
                    }
                  }
                }
              }
            },
            "401": errorResponse
          }
        }),
        post: operation({
          tags: ["Photos"],
          summary: "Create photo metadata after original upload.",
          requestBody: jsonRequest({ $ref: "#/components/schemas/PhotoCreateRequest" }),
          responses: {
            "201": { description: "Created photo", content: { "application/json": { schema: { $ref: "#/components/schemas/Photo" } } } },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse
          }
        })
      },
      "/api/photos/{id}": {
        get: operation({
          tags: ["Photos"],
          summary: "Get an admin photo record.",
          parameters: [idParameter()],
          responses: {
            "200": { description: "Photo", content: { "application/json": { schema: { $ref: "#/components/schemas/Photo" } } } },
            "401": errorResponse,
            "404": errorResponse
          }
        }),
        patch: operation({
          tags: ["Photos"],
          summary: "Update photo metadata or representative image.",
          parameters: [idParameter()],
          requestBody: jsonRequest({ $ref: "#/components/schemas/PhotoUpdateRequest" }),
          responses: {
            "200": { description: "Updated photo", content: { "application/json": { schema: { $ref: "#/components/schemas/Photo" } } } },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
            "404": errorResponse
          }
        }),
        delete: operation({
          tags: ["Photos"],
          summary: "Soft delete a photo.",
          parameters: [idParameter()],
          responses: {
            "200": okResponse,
            "401": errorResponse,
            "403": errorResponse
          }
        })
      },
      "/api/photos/{id}/process": {
        post: operation({
          tags: ["Photos"],
          summary: "Generate processed public images from private originals.",
          parameters: [idParameter()],
          responses: { "200": okResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse }
        })
      },
      "/api/photos/{id}/assets/upload-url": {
        post: operation({
          tags: ["Photos"],
          summary: "Create a presigned upload URL for an additional private original asset.",
          parameters: [idParameter()],
          requestBody: jsonRequest({ $ref: "#/components/schemas/UploadUrlRequest" }),
          responses: {
            "200": {
              description: "Presigned upload URL for an additional asset",
              content: { "application/json": { schema: { $ref: "#/components/schemas/AssetUploadUrlResponse" } } }
            },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
            "404": errorResponse
          }
        })
      },
      "/api/photos/{id}/assets": {
        get: operation({
          tags: ["Photos"],
          summary: "List assets attached to an admin photo record.",
          parameters: [idParameter()],
          responses: {
            "200": {
              description: "Photo assets",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: { $ref: "#/components/schemas/PhotoAsset" } }
                    }
                  }
                }
              }
            },
            "401": errorResponse
          }
        }),
        post: operation({
          tags: ["Photos"],
          summary: "Create metadata for an uploaded additional photo asset.",
          parameters: [idParameter()],
          requestBody: jsonRequest({ $ref: "#/components/schemas/PhotoAssetCreateRequest" }),
          responses: {
            "201": { description: "Created photo asset", content: { "application/json": { schema: { $ref: "#/components/schemas/PhotoAsset" } } } },
            "400": errorResponse,
            "401": errorResponse,
            "403": errorResponse,
            "404": errorResponse,
            "409": errorResponse
          }
        })
      },
      "/api/photos/{id}/download-url": {
        get: operation({
          tags: ["Photos"],
          summary: "Create a short-lived signed original download URL.",
          parameters: [idParameter()],
          responses: {
            "200": {
              description: "Signed download URL",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      downloadUrl: { type: "string", format: "uri" },
                      expiresIn: { type: "integer", example: 600 }
                    }
                  }
                }
              }
            },
            "401": errorResponse,
            "404": errorResponse
          }
        })
      },
      "/api/tags": {
        get: operation({
          tags: ["Tags"],
          summary: "List tags.",
          responses: {
            "200": { description: "Tags", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Tag" } } } } },
            "401": errorResponse
          }
        }),
        post: operation({
          tags: ["Tags"],
          summary: "Create a tag.",
          requestBody: jsonRequest({
            type: "object",
            required: ["name"],
            properties: { name: { type: "string", maxLength: 40 } }
          }),
          responses: { "201": okResponse, "400": errorResponse, "401": errorResponse, "403": errorResponse }
        })
      },
      "/api/tags/{id}": {
        patch: operation({
          tags: ["Tags"],
          summary: "Update a tag.",
          parameters: [idParameter()],
          requestBody: jsonRequest({ type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 40 } } }),
          responses: { "200": okResponse, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse }
        }),
        delete: operation({
          tags: ["Tags"],
          summary: "Delete a tag.",
          parameters: [idParameter()],
          responses: { "200": okResponse, "401": errorResponse, "403": errorResponse }
        })
      },
      "/api/collections": {
        get: operation({
          tags: ["Collections"],
          summary: "List collections.",
          responses: {
            "200": { description: "Collections", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Collection" } } } } },
            "401": errorResponse
          }
        }),
        post: operation({
          tags: ["Collections"],
          summary: "Create a collection.",
          requestBody: jsonRequest({
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string", maxLength: 160 },
              description: { type: "string", maxLength: 2000 },
              visibility: { type: "string", enum: ["private", "public", "unlisted", "draft"] }
            }
          }),
          responses: { "201": okResponse, "400": errorResponse, "401": errorResponse, "403": errorResponse }
        })
      },
      "/api/collections/{id}": {
        patch: operation({
          tags: ["Collections"],
          summary: "Update a collection.",
          parameters: [idParameter()],
          requestBody: jsonRequest({ $ref: "#/components/schemas/Collection" }),
          responses: { "200": okResponse, "400": errorResponse, "401": errorResponse, "403": errorResponse, "404": errorResponse }
        }),
        delete: operation({
          tags: ["Collections"],
          summary: "Delete a collection.",
          parameters: [idParameter()],
          responses: { "200": okResponse, "401": errorResponse, "403": errorResponse }
        })
      },
      "/api/collections/{id}/photos": {
        put: operation({
          tags: ["Collections"],
          summary: "Replace collection photo membership.",
          parameters: [idParameter()],
          requestBody: jsonRequest({
            type: "object",
            required: ["photoIds"],
            properties: { photoIds: { type: "array", items: { type: "string", format: "uuid" } } }
          }),
          responses: { "200": okResponse, "400": errorResponse, "401": errorResponse, "403": errorResponse }
        })
      },
      "/api/collections/{slug}": {
        get: operation({
          tags: ["Collections"],
          summary: "Get a public collection by slug.",
          parameters: [slugParameter],
          responses: { "200": okResponse, "404": errorResponse }
        })
      },
      "/api/admin/login": {
        post: {
          summary: "Create an admin session.",
          tags: ["Admin"],
          requestBody: jsonRequest({
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", format: "password" }
            }
          }),
          responses: { "200": okResponse, "400": errorResponse, "401": errorResponse, "403": errorResponse }
        }
      },
      "/api/admin/logout": {
        post: operation({
          tags: ["Admin"],
          summary: "Clear the admin session.",
          responses: { "200": okResponse, "401": errorResponse, "403": errorResponse }
        })
      },
      "/api/openapi.json": {
        get: operation({
          tags: ["Admin"],
          summary: "Get this Swagger-compatible OpenAPI document.",
          responses: {
            "200": { description: "OpenAPI document", content: { "application/json": { schema: { type: "object" } } } },
            "401": errorResponse
          }
        })
      }
    }
  };
}
