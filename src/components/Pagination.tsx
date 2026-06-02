import React from "react";
import Link from "next/link";

export function getPageWindow(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 10) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - 2; page <= currentPage + 2; page++) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push("ellipsis");
    result.push(page);
    previous = page;
  }

  return result;
}

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageWindow = getPageWindow(currentPage, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="Pagination" className="pagination">
      {hasPrevious ? (
        <Link className="pagination-link" href={buildHref(currentPage - 1)} rel="prev">
          ‹ Prev
        </Link>
      ) : (
        <span aria-disabled="true" className="pagination-link">
          ‹ Prev
        </span>
      )}

      {pageWindow.map((entry, index) => {
        if (entry === "ellipsis") {
          return (
            <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
              …
            </span>
          );
        }

        if (entry === currentPage) {
          return (
            <span aria-current="page" className="pagination-link pagination-current" key={entry}>
              {entry}
            </span>
          );
        }

        return (
          <Link className="pagination-link" href={buildHref(entry)} key={entry}>
            {entry}
          </Link>
        );
      })}

      {hasNext ? (
        <Link className="pagination-link" href={buildHref(currentPage + 1)} rel="next">
          Next ›
        </Link>
      ) : (
        <span aria-disabled="true" className="pagination-link">
          Next ›
        </span>
      )}
    </nav>
  );
}
