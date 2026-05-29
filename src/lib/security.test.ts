import { afterEach, describe, expect, it } from "vitest";

import { assertSameOriginRequest, INVALID_REQUEST_ORIGIN_MESSAGE } from "./security";

const originalNodeEnv = process.env.NODE_ENV;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function createRequest(headers?: HeadersInit) {
  return new Request("http://localhost:3000/api/photos", {
    method: "POST",
    headers
  });
}

describe("assertSameOriginRequest", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("accepts a request with a same-origin Origin header", () => {
    expect(() =>
      assertSameOriginRequest(createRequest({ origin: "http://localhost:3000" }) as never)
    ).not.toThrow();
  });

  it("accepts a request with a same-origin Referer when Origin is missing", () => {
    expect(() =>
      assertSameOriginRequest(createRequest({ referer: "http://localhost:3000/admin/photos" }) as never)
    ).not.toThrow();
  });

  it("accepts the configured canonical site origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://photos.example.com";

    expect(() =>
      assertSameOriginRequest(createRequest({ origin: "https://photos.example.com" }) as never)
    ).not.toThrow();
  });

  it("rejects cross-origin requests", () => {
    expect(() =>
      assertSameOriginRequest(createRequest({ origin: "https://attacker.example" }) as never)
    ).toThrow(INVALID_REQUEST_ORIGIN_MESSAGE);
  });

  it("rejects requests without Origin or Referer in production", () => {
    process.env.NODE_ENV = "production";

    expect(() => assertSameOriginRequest(createRequest() as never)).toThrow(
      INVALID_REQUEST_ORIGIN_MESSAGE
    );
  });
});
