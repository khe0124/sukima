import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { metadata } from "../layout";
import AdminLoginPage from "./page";

describe("AdminLoginPage", () => {
  it("posts credentials without putting them in the URL before hydration", () => {
    const html = renderToStaticMarkup(<AdminLoginPage />);

    expect(html).toContain('<form action="/api/admin/login"');
    expect(html).toContain('method="post"');
  });

  it("links to Google admin login", () => {
    const html = renderToStaticMarkup(<AdminLoginPage />);

    expect(html).toContain('href="/api/admin/auth/google"');
    expect(html).toContain("Continue with Google");
  });

  it("prevents admin login indexing", () => {
    expect(metadata.robots).toEqual({
      index: false,
      follow: false
    });
  });
});
