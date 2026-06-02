# Numbered Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사진 목록 페이지네이션을 cursor 기반에서 offset/page 기반 숫자 페이지로 전환한다 (archive/admin/JSON API 전부 + OpenAPI).

**Architecture:** `getPhotos`를 `cursor` → `page`(1-indexed)로 바꾸고, `COUNT(*)`로 total을 구한 뒤 `LIMIT/OFFSET`로 페이지를 가져온다. 반환을 `{ items, page, pageSize, total, totalPages }`로 변경. 새 표현 컴포넌트 `Pagination`이 윈도잉(≤10 전부 / >10 ellipsis)과 Prev/Next를 렌더하고, archive·admin 페이지가 기존 쿼리 파라미터를 보존하며 이를 사용한다.

**Tech Stack:** Next.js 14 (App Router, server components), Postgres (pg), Zod, Vitest + Testing Library, hand-written CSS in globals.css.

**검증 게이트:** 각 태스크 후 `npm run lint && npm test`. 참고: `npx tsc --noEmit`에는 **이번 작업과 무관한 pre-existing 에러 3개**가 있다 — `src/app/admin/photos/upload/page.test.tsx`(photoCount), `src/lib/security.test.ts`(NODE_ENV ×2). 새로 작성하는 코드는 이 3개 외에 tsc 에러를 추가하면 안 된다. 현재 기준선: **101 tests passed (28 files)**.

**Spec 대비 의도적 deviation 1건:** spec의 "API route 테스트"는 만들지 않는다 — `src/app/api/photos/route.ts`는 `getPhotos`로 위임만 하는 thin pass-through이고, 기존 route 테스트 인프라/파일이 없으며 auth+getPhotos 모킹 비용이 가치 대비 크다. 계약 변경은 `getPhotos`(아래)와 OpenAPI, dev 서버 육안 확인으로 커버한다.

---

## File Structure

- **Modify** `src/lib/photos.ts` — `normalizePhotoListPage` 추가 (page 정규화 책임).
- **Modify** `src/lib/photos.test.ts` — `normalizePhotoListPage` 테스트 추가.
- **Create** `src/components/Pagination.tsx` — 순수 표현 pager 컴포넌트 + `getPageWindow` 순수 함수. (신규 공용 컴포넌트 디렉터리)
- **Create** `src/components/Pagination.test.tsx` — 윈도잉/상태/렌더 테스트.
- **Modify** `src/app/globals.css` — `.pagination` 스타일 추가, 미사용된 `.pagination-row` 제거.
- **Modify** `src/server/photos.ts` — `parsePhotoListQuery`(cursor→page), `getPhotos`(offset/count/반환 shape), `PhotoListQueryInput` 타입.
- **Modify** `src/server/photos.test.ts` — `parsePhotoListQuery` 테스트 2개를 page 기반으로 갱신.
- **Modify** `src/app/archive/page.tsx` — page 쿼리 + `<Pagination>`.
- **Modify** `src/app/admin/photos/page.tsx` — page 쿼리 + 필터 보존 `<Pagination>`.
- **Modify** `src/app/api/photos/route.ts` — `cursor` → `page` 쿼리.
- **Modify** `src/app/admin/collections/page.tsx` & `src/app/admin/collections/[id]/edit/page.tsx` — `cursor: null` → `page: "1"`.
- **Modify** `src/lib/openapi.ts` — `/api/photos` GET 파라미터/응답 스키마.

---

## Task 1: `normalizePhotoListPage` (lib)

격리된 순수 함수. 빌드 안 깨짐.

**Files:**
- Modify: `src/lib/photos.ts`
- Test: `src/lib/photos.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/photos.test.ts` 상단 import에 `normalizePhotoListPage`를 추가한다. 현재 import 라인을 확인하고(`normalizePhotoListLimit` 등을 `./photos`에서 가져오는 줄) 거기에 `normalizePhotoListPage`를 추가. 그리고 `normalizePhotoListLimit` describe 블록 바로 아래에 추가:

```ts
describe("normalizePhotoListPage", () => {
  it("defaults to page 1 for missing, zero, negative, or non-numeric input", () => {
    expect(normalizePhotoListPage(null)).toBe(1);
    expect(normalizePhotoListPage("")).toBe(1);
    expect(normalizePhotoListPage("0")).toBe(1);
    expect(normalizePhotoListPage("-3")).toBe(1);
    expect(normalizePhotoListPage("abc")).toBe(1);
  });

  it("parses a valid 1-indexed page number", () => {
    expect(normalizePhotoListPage("1")).toBe(1);
    expect(normalizePhotoListPage("7")).toBe(7);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/photos.test.ts`
Expected: FAIL — `normalizePhotoListPage is not exported` / not a function.

- [ ] **Step 3: 구현**

`src/lib/photos.ts`에서 `normalizePhotoListLimit` 함수 바로 아래에 추가:

```ts
export function normalizePhotoListPage(value: string | null) {
  if (!value) return 1;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;

  return parsed;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/photos.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/photos.ts src/lib/photos.test.ts
git commit -m "feat(pagination): add normalizePhotoListPage helper"
```

---

## Task 2: `Pagination` 컴포넌트 + `getPageWindow` + CSS

신규 파일 + CSS. 아직 아무도 안 씀 → 격리, 빌드 green.

**Files:**
- Create: `src/components/Pagination.tsx`
- Create: `src/components/Pagination.test.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/Pagination.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/Pagination.test.tsx`
Expected: FAIL — `./Pagination` 모듈/내보내기 없음.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/Pagination.tsx`:

```tsx
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/Pagination.test.tsx`
Expected: PASS (모든 케이스).

- [ ] **Step 5: CSS 추가 + 미사용 규칙 제거**

`src/app/globals.css`에서 기존 `.pagination-row` 규칙을 찾는다:

```css
.pagination-row {
  margin-top: 28px;
}
```

이것을 아래로 **교체**한다 (`.pagination-row`는 Task 3에서 마크업이 제거되므로 삭제하고, 새 `.pagination` 스타일로 대체):

```css
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 28px;
  font-size: 0.75rem;
}

.pagination-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border: 1px solid var(--line);
  border-radius: 0;
  background: var(--surface);
  padding: 0 8px;
  color: var(--muted);
  font-weight: 500;
  text-decoration: none;
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background 140ms ease;
}

a.pagination-link:hover {
  border-color: var(--foreground);
  color: var(--foreground);
}

.pagination-current {
  border-color: var(--foreground);
  background: var(--foreground);
  color: #fff;
}

.pagination-link[aria-disabled="true"] {
  color: var(--line);
  cursor: default;
}

.pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  color: var(--muted);
}
```

- [ ] **Step 6: lint + 전체 테스트**

Run: `npm run lint && npm test`
Expected: lint clean, 이전 101개 + 신규 Pagination 테스트 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/components/Pagination.tsx src/components/Pagination.test.tsx src/app/globals.css
git commit -m "feat(pagination): add Pagination component with page windowing"
```

---

## Task 3: 백엔드 계약 전환 + 모든 consumer + OpenAPI

`getPhotos` signature 변경이 모든 호출부의 타입을 동시에 깨뜨리므로 한 태스크로 원자적으로 처리한다. 끝에서 빌드/테스트 green.

**Files:**
- Modify: `src/server/photos.ts`
- Modify: `src/server/photos.test.ts`
- Modify: `src/app/archive/page.tsx`
- Modify: `src/app/admin/photos/page.tsx`
- Modify: `src/app/api/photos/route.ts`
- Modify: `src/app/admin/collections/page.tsx`
- Modify: `src/app/admin/collections/[id]/edit/page.tsx`
- Modify: `src/lib/openapi.ts`

- [ ] **Step 1: `parsePhotoListQuery` 테스트를 page 기반으로 갱신 (실패 상태로)**

`src/server/photos.test.ts`의 `describe("parsePhotoListQuery", ...)` 블록 안 두 테스트를 교체한다.

첫 번째 테스트(현재 `cursor: "cursor-photo"` 입력/출력) 교체:

```ts
  it("normalizes admin list query options for filters, search, sorting, and page size", () => {
    expect(
      parsePhotoListQuery({
        limit: "200",
        page: "3",
        search: "  rainy night  ",
        tag: "Street",
        status: "ready",
        visibility: "public",
        sort: "oldest"
      })
    ).toEqual({
      limit: 100,
      page: 3,
      search: "rainy night",
      tag: "street",
      status: "ready",
      visibility: "public",
      sort: "oldest"
    });
  });
```

두 번째 테스트(현재 `cursor: ""`) 교체:

```ts
  it("drops unsupported filters and falls back to newest sorting", () => {
    expect(
      parsePhotoListQuery({
        limit: "0",
        page: "0",
        search: "x".repeat(180),
        tag: "",
        status: "deleted",
        visibility: "everyone",
        sort: "random"
      })
    ).toEqual({
      limit: 30,
      page: 1,
      search: "x".repeat(160),
      tag: null,
      status: null,
      visibility: null,
      sort: "newest"
    });
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/server/photos.test.ts`
Expected: FAIL — 반환 객체에 `page`가 없고 `cursor`가 남아있어 `toEqual` 불일치.

- [ ] **Step 3: `photos.ts` import에 `normalizePhotoListPage` 추가**

`src/server/photos.ts` 상단의 import 라인을 교체:

```ts
import { ALLOWED_IMAGE_TYPES, normalizePhotoListLimit, toPublicPhotoUrl } from "@/lib/photos";
```
→
```ts
import {
  ALLOWED_IMAGE_TYPES,
  normalizePhotoListLimit,
  normalizePhotoListPage,
  toPublicPhotoUrl
} from "@/lib/photos";
```

- [ ] **Step 4: `PhotoListQueryInput` 타입의 `cursor` → `page`**

`src/server/photos.ts`에서:

```ts
type PhotoListQueryInput = {
  limit?: string | null;
  cursor?: string | null;
  tag?: string | null;
  search?: string | null;
  status?: string | null;
  visibility?: string | null;
  sort?: string | null;
};
```
→ `cursor?` 줄을 `page?`로:
```ts
type PhotoListQueryInput = {
  limit?: string | null;
  page?: string | null;
  tag?: string | null;
  search?: string | null;
  status?: string | null;
  visibility?: string | null;
  sort?: string | null;
};
```

- [ ] **Step 5: `parsePhotoListQuery`에서 cursor → page**

```ts
  return {
    limit: normalizePhotoListLimit(input.limit ?? null),
    cursor: normalizeTextQuery(input.cursor, 120),
    search: normalizeTextQuery(input.search, 160),
    ...
```
의 `cursor` 줄을 교체:
```ts
  return {
    limit: normalizePhotoListLimit(input.limit ?? null),
    page: normalizePhotoListPage(input.page ?? null),
    search: normalizeTextQuery(input.search, 160),
    tag: tagSlug ? slugify(tagSlug) || null : null,
    status: isPhotoListStatus(status) ? status : null,
    visibility: isPhotoListVisibility(visibility) ? visibility : null,
    sort: isPhotoListSort(sort) ? sort : "newest"
  };
```

- [ ] **Step 6: `getPhotos` 전체 교체 (offset/count/반환 shape)**

`src/server/photos.ts`의 `export async function getPhotos(...) { ... }` 함수 전체(현재 시그니처부터 닫는 `}`까지, `cursorClauseBySort`/`orderByBySort`/쿼리/return 포함)를 아래로 교체:

```ts
export async function getPhotos({
  limit,
  page,
  includePrivate = false,
  tag,
  search,
  status,
  visibility,
  sort
}: {
  limit: string | null;
  page: string | null;
  includePrivate?: boolean;
  tag?: string | null;
  search?: string | null;
  status?: string | null;
  visibility?: string | null;
  sort?: string | null;
}) {
  const listQuery = parsePhotoListQuery({ limit, page, tag, search, status, visibility, sort });
  const filterValues: unknown[] = [];
  const where = [includePrivate ? "p.status <> 'deleted'" : "p.visibility = 'public' AND p.status = 'ready'"];

  if (includePrivate && listQuery.status) {
    filterValues.push(listQuery.status);
    where.push(`p.status = $${filterValues.length}`);
  }

  if (includePrivate && listQuery.visibility) {
    filterValues.push(listQuery.visibility);
    where.push(`p.visibility = $${filterValues.length}`);
  }

  if (listQuery.search) {
    filterValues.push(`%${listQuery.search}%`);
    const searchValue = `$${filterValues.length}`;
    where.push(
      `(p.title ILIKE ${searchValue}
        OR p.description ILIKE ${searchValue}
        OR EXISTS (
          SELECT 1
          FROM photo_tags search_pt
          JOIN tags search_t ON search_t.id = search_pt.tag_id
          WHERE search_pt.photo_id = p.id AND search_t.name ILIKE ${searchValue}
        ))`
    );
  }

  if (listQuery.tag) {
    filterValues.push(listQuery.tag);
    where.push(
      `EXISTS (
        SELECT 1
        FROM photo_tags filter_pt
        JOIN tags filter_t ON filter_t.id = filter_pt.tag_id
        WHERE filter_pt.photo_id = p.id AND filter_t.slug = $${filterValues.length}
      )`
    );
  }

  const whereClause = where.join(" AND ");

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM photos p WHERE ${whereClause}`,
    filterValues
  );
  const total = Number.parseInt(countResult.rows[0]?.total ?? "0", 10);

  const pageSize = listQuery.limit;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(listQuery.page, totalPages);
  const offset = (resolvedPage - 1) * pageSize;

  const orderByBySort: Record<PhotoListSort, string> = {
    newest: "p.uploaded_at DESC, p.id DESC",
    oldest: "p.uploaded_at ASC, p.id ASC",
    "taken-newest": "COALESCE(p.taken_at, p.uploaded_at) DESC, p.id DESC",
    "taken-oldest": "COALESCE(p.taken_at, p.uploaded_at) ASC, p.id ASC",
    "title-asc": "COALESCE(LOWER(p.title), '') ASC, p.id ASC",
    "title-desc": "COALESCE(LOWER(p.title), '') DESC, p.id DESC"
  };

  const pageValues = [...filterValues, pageSize, offset];
  const result = await query<PhotoRow>(
    `SELECT
       p.id,
       p.title,
       p.slug,
       p.description,
       p.status,
       p.visibility,
       p.storage_key_thumbnail,
       p.storage_key_medium,
       p.storage_key_large,
       p.storage_key_blur,
       p.width,
       p.height,
       p.taken_at,
       p.uploaded_at,
       COALESCE(array_remove(array_agg(t.name ORDER BY t.name), NULL), '{}') AS tags
     FROM photos p
     LEFT JOIN photo_tags pt ON pt.photo_id = p.id
     LEFT JOIN tags t ON t.id = pt.tag_id
     WHERE ${whereClause}
     GROUP BY p.id
     ORDER BY ${orderByBySort[listQuery.sort]}
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );

  const items: PhotoListItem[] = result.rows.map(mapPhotoRow);

  return { items, page: resolvedPage, pageSize, total, totalPages };
}
```

(참고: 기존 `cursorClauseBySort` 레코드와 `values[0] = limit + 1`, `result.rows.slice(...)`, `nextCursor` 로직은 위 교체로 모두 사라진다.)

- [ ] **Step 7: parse 테스트 통과 확인**

Run: `npx vitest run src/server/photos.test.ts`
Expected: PASS.

- [ ] **Step 8: `archive/page.tsx` — page + Pagination**

`src/app/archive/page.tsx`:

(a) import 추가 (기존 `import Link from "next/link";` 아래):
```ts
import { Pagination } from "@/components/Pagination";
```

(b) props 타입의 `cursor` → `page`:
```ts
type ArchivePageProps = {
  searchParams: { cursor?: string; tag?: string };
};
```
→
```ts
type ArchivePageProps = {
  searchParams: { page?: string; tag?: string };
};
```

(c) 데이터 패칭부 — 현재:
```ts
  const photos = await getPhotos({
    limit: "30",
    cursor: searchParams.cursor ?? null,
    tag: activeTag || null,
  });
  const nextHref = photos.nextCursor
    ? `/archive?${new URLSearchParams({
        ...(activeTag ? { tag: activeTag } : {}),
        cursor: photos.nextCursor,
      }).toString()}`
    : "";
```
→ 교체:
```ts
  const photos = await getPhotos({
    limit: "30",
    page: searchParams.page ?? null,
    tag: activeTag || null,
  });
  const buildArchiveHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/archive?${queryString}` : "/archive";
  };
```

(d) 렌더 하단 — 현재:
```tsx
      {nextHref ? (
        <p className="pagination-row">
          <Link className="button-link secondary" href={nextHref}>
            More
          </Link>
        </p>
      ) : null}
```
→ 교체:
```tsx
      <Pagination
        buildHref={buildArchiveHref}
        currentPage={photos.page}
        totalPages={photos.totalPages}
      />
```

- [ ] **Step 9: `admin/photos/page.tsx` — page + 필터 보존 Pagination**

`src/app/admin/photos/page.tsx`:

(a) import 추가 (기존 `import Link from "next/link";` 아래):
```ts
import { Pagination } from "@/components/Pagination";
```

(b) searchParams 타입의 `cursor?: string;` → `page?: string;`.

(c) 데이터/파라미터부 — 현재:
```ts
  const photos = await getPhotos({
    limit,
    cursor: searchParams.cursor ?? null,
    includePrivate: true,
    search: search || null,
    tag: tag || null,
    status: status || null,
    visibility: visibility || null,
    sort
  });
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries({ limit, search, tag, status, visibility, sort })) {
    if (value) nextParams.set(key, value);
  }
  if (photos.nextCursor) nextParams.set("cursor", photos.nextCursor);
```
→ 교체:
```ts
  const photos = await getPhotos({
    limit,
    page: searchParams.page ?? null,
    includePrivate: true,
    search: search || null,
    tag: tag || null,
    status: status || null,
    visibility: visibility || null,
    sort
  });
  const buildAdminHref = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ limit, search, tag, status, visibility, sort })) {
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/admin/photos?${queryString}` : "/admin/photos";
  };
```

(d) 렌더 하단 — 현재:
```tsx
      {photos.nextCursor ? (
        <p className="pagination-row">
          <Link className="button-link secondary" href={`/admin/photos?${nextParams.toString()}`}>
            Next page
          </Link>
        </p>
      ) : null}
```
→ 교체:
```tsx
      <Pagination
        buildHref={buildAdminHref}
        currentPage={photos.page}
        totalPages={photos.totalPages}
      />
```

- [ ] **Step 10: `api/photos/route.ts` — cursor → page**

`src/app/api/photos/route.ts`의 GET 내부:
```ts
      cursor: searchParams.get("cursor"),
```
→
```ts
      page: searchParams.get("page"),
```
(응답은 `getPhotos` 결과를 그대로 반환하므로 자동으로 새 shape가 된다.)

- [ ] **Step 11: collections 두 페이지 — cursor:null → page:"1"**

`src/app/admin/collections/page.tsx`:
```ts
    getPhotos({ limit: "100", cursor: null, includePrivate: true })
```
→
```ts
    getPhotos({ limit: "100", page: "1", includePrivate: true })
```

`src/app/admin/collections/[id]/edit/page.tsx`:
```ts
    getPhotos({ limit: "100", cursor: null, includePrivate: true })
```
→
```ts
    getPhotos({ limit: "100", page: "1", includePrivate: true })
```

- [ ] **Step 12: OpenAPI 갱신**

`src/lib/openapi.ts`의 `/api/photos` GET에서:

(a) summary:
```ts
          summary: "List photos with cursor pagination.",
```
→
```ts
          summary: "List photos with page-based pagination.",
```

(b) 파라미터 — `cursor` 줄:
```ts
            { name: "cursor", in: "query", schema: { type: "string" } },
```
→
```ts
            { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
```

(c) 응답 properties:
```ts
                      items: { type: "array", items: { $ref: "#/components/schemas/Photo" } },
                      nextCursor: { type: ["string", "null"] }
```
→
```ts
                      items: { type: "array", items: { $ref: "#/components/schemas/Photo" } },
                      page: { type: "integer" },
                      pageSize: { type: "integer" },
                      total: { type: "integer" },
                      totalPages: { type: "integer" }
```

- [ ] **Step 13: 잔여 cursor/nextCursor 확인**

Run: `grep -rn "cursor\|nextCursor" src --include="*.ts" --include="*.tsx" | grep -v ".test."`
Expected: 출력 없음 (소스에서 cursor 완전히 제거됨).

- [ ] **Step 14: lint + typecheck + 전체 테스트**

Run: `npm run lint && npx tsc --noEmit; npm test`
Expected: lint clean. tsc는 **pre-existing 3개만**(upload/page.test.tsx photoCount, security.test.ts NODE_ENV ×2) — 그 외 에러 없어야 함. 테스트 전부 통과.

- [ ] **Step 15: 커밋**

```bash
git add src/server/photos.ts src/server/photos.test.ts src/app/archive/page.tsx src/app/admin/photos/page.tsx src/app/api/photos/route.ts src/app/admin/collections/page.tsx "src/app/admin/collections/[id]/edit/page.tsx" src/lib/openapi.ts
git commit -m "feat(pagination): switch photo lists and API to offset/page pagination"
```

---

## Task 4: 육안 검증 (dev 서버)

**Files:** 없음 (검증 전용)

- [ ] **Step 1: dev 서버 기동**

Run: `npm run dev`
Expected: 기동(포트 3000 또는 3001). 로그에 컴파일 에러 없음.

- [ ] **Step 2: 화면 확인**

브라우저로:
- `/archive` — 숫자 pager 노출(사진이 30개 초과일 때). 숫자 클릭 시 URL이 `?page=N`으로 바뀌고 해당 페이지 렌더. 1페이지로 가면 `page` param 사라짐.
- `/archive?tag=<있는태그>` — 페이지 이동해도 `tag`가 유지됨(`?tag=...&page=2`).
- `/admin/photos` — 필터(search/sort 등) 적용 후 페이지 이동 시 필터 유지.
- 마지막 페이지에서 Next 비활성, 1페이지에서 Prev 비활성.
- 범위 밖 수동 입력(`/archive?page=9999`) → 마지막 페이지로 clamp되어 렌더.

- [ ] **Step 3: API 응답 확인**

Run: `curl -s "http://localhost:3000/api/photos?page=1" | head -c 400` (포트는 dev 로그에 맞춰 조정)
Expected: JSON에 `items`, `page`, `pageSize`, `total`, `totalPages` 포함, `nextCursor` 없음.

- [ ] **Step 4: 최종 점검 + dev 서버 종료**

Run: `npm run lint && npm test`
Expected: 전부 통과.
그다음 dev 서버 종료(`lsof -ti:3000 | xargs kill` 또는 해당 포트).

---

## Self-Review (작성자 체크)

- **Spec coverage:** offset 전환·count·clamp·반환 shape(Task 3 Step 6), `normalizePhotoListPage`(Task 1), Pagination+윈도잉(Task 2), archive/admin/api/collections consumer(Task 3 Step 8–11), OpenAPI(Step 12), CSS(Task 2 Step 5), 테스트(Task 1·2, Step 1)·엣지 clamp(Step 6, Task 4 Step 2) 모두 커버. Out of scope(collections 100+ 한계, 무한스크롤)는 손대지 않음. Deviation: API route 테스트 생략(상단에 사유 명시).
- **Placeholder scan:** TBD/TODO 없음. 모든 코드 단계에 실제 코드 포함.
- **Type consistency:** 반환 shape `{ items, page, pageSize, total, totalPages }`가 getPhotos·consumer·OpenAPI에서 일치. `getPageWindow`/`Pagination`/`normalizePhotoListPage` 이름이 정의부와 import에서 일치.
- **버그 1건 사전 차단:** `getPhotos` 파라미터명이 `page`(string|null)이므로 내부 계산값을 `const page`로 재선언하면 동일 스코프 SyntaxError. Step 6 코드는 내부 변수를 `resolvedPage`로 쓰고 `return { ..., page: resolvedPage, ... }`로 반환하도록 이미 수정함.
