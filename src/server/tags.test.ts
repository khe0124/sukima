import { describe, expect, it } from "vitest";

import { parseTagRequest } from "./tags";

describe("parseTagRequest", () => {
  it("accepts a tag name", () => {
    expect(parseTagRequest({ name: "Seoul Night" })).toEqual({
      name: "Seoul Night"
    });
  });

  it("rejects empty tag names", () => {
    expect(() => parseTagRequest({ name: "" })).toThrow();
  });
});
