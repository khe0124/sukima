// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pagination, getPageWindow } from "./Pagination";

describe("getPageWindow", () => {
  it("lists every page when there are 10 or fewer", () => {
    expect(getPageWindow(3, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("windows around the current page with ellipses when there are more than 10", () => {
    expect(getPageWindow(6, 20)).toEqual([1, "ellipsis", 4, 5, 6, 7, 8, "ellipsis", 20]);
  });

  it("omits the leading ellipsis when the current page is near the start", () => {
    expect(getPageWindow(2, 20)).toEqual([1, 2, 3, 4, "ellipsis", 20]);
  });

  it("omits the trailing ellipsis when the current page is near the end", () => {
    expect(getPageWindow(19, 20)).toEqual([1, "ellipsis", 17, 18, 19, 20]);
  });
});

describe("Pagination", () => {
  const buildHref = (page: number) => `/archive?page=${page}`;

  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} buildHref={buildHref} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("marks the current page with aria-current and renders it as non-link text", () => {
    render(<Pagination currentPage={3} totalPages={5} buildHref={buildHref} />);
    const current = screen.getByText("3");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).not.toBe("A");
  });

  it("disables Prev on the first page and Next on the last page", () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={5} buildHref={buildHref} />
    );
    expect(screen.getByText("‹ Prev")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Next ›").tagName).toBe("A");

    rerender(<Pagination currentPage={5} totalPages={5} buildHref={buildHref} />);
    expect(screen.getByText("Next ›")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("‹ Prev").tagName).toBe("A");
  });

  it("builds hrefs for non-current page numbers", () => {
    render(<Pagination currentPage={2} totalPages={5} buildHref={buildHref} />);
    expect(screen.getByText("4").closest("a")).toHaveAttribute("href", "/archive?page=4");
  });
});
