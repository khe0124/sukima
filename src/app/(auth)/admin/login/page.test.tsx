import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminLoginPage from "./page";

describe("AdminLoginPage", () => {
  it("posts credentials without putting them in the URL before hydration", () => {
    const html = renderToStaticMarkup(<AdminLoginPage />);

    expect(html).toContain('<form action="/api/admin/login"');
    expect(html).toContain('method="post"');
  });
});
