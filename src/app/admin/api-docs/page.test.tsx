import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminApiDocsPage from "./page";

describe("AdminApiDocsPage", () => {
  it("renders OpenAPI docs in card and table sections", () => {
    const html = renderToStaticMarkup(<AdminApiDocsPage />);

    expect(html).toContain("api-docs-card");
    expect(html).toContain("api-docs-table");
    expect(html).toContain("OpenAPI JSON");
    expect(html).toContain("/api/photos/upload-url");
  });
});
