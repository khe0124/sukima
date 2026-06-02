# Numbered Pagination — Design Spec

## Goal

사진 목록의 페이지네이션을 cursor 기반 "More/Next" 버튼에서 **숫자 페이지 + `page` 쿼리 유지** 방식으로 바꾼다. 임의 페이지로 점프할 수 있어야 하고, 기존 필터 쿼리가 페이지 이동 중에도 보존되어야 한다.

적용 범위: **공개 `/archive`, 관리자 `/admin/photos`, JSON API `/api/photos` 전부** (cursor → offset/page로 통일, OpenAPI 문서 포함).

## Why offset, not cursor

숫자 페이지(예: 5페이지로 바로 점프)는 cursor로 불가능하다 — cursor는 "다음 N개"만 안다. 임의 페이지는 `OFFSET/LIMIT` + 전체 개수 `COUNT(*)`가 필요하다. 개인 사진 아카이브 규모에서 offset 성능은 문제되지 않는다.

## Architecture

### 1. Backend: `getPhotos` (`src/server/photos.ts`)

- 파라미터 `cursor: string | null` → `page: string | null` (1-indexed).
- `parsePhotoListQuery`에서 cursor 파싱 제거, `page` 파싱 추가.
- `cursorClauseBySort` 레코드와 cursor WHERE 절 전부 제거. `orderByBySort`는 유지.
- WHERE / values 배열을 cursor 절 없이 구성한다.
- 쿼리 2개:
  1. **count**: `SELECT COUNT(*) AS total FROM photos p WHERE ${where}` — 같은 WHERE/values(단 limit·offset 제외). tag/search 필터는 EXISTS 서브쿼리라 join 없이 count 가능.
  2. **page**: 기존 SELECT(태그 집계 위한 LEFT JOIN + GROUP BY p.id) + `ORDER BY ${orderByBySort[sort]} LIMIT $limit OFFSET $offset`.
- 페이지 계산:
  - `pageSize = listQuery.limit`
  - `total` = count 결과
  - `totalPages = Math.max(1, Math.ceil(total / pageSize))`
  - `page = clamp(requestedPage, 1, totalPages)` — 범위 밖이면 끝으로 보정
  - `offset = (page - 1) * pageSize`
- 반환 타입 변경:
  ```ts
  { items: PhotoListItem[]; page: number; pageSize: number; total: number; totalPages: number }
  ```
  `nextCursor` 제거.

### 2. `src/lib/photos.ts`

- 신규: `normalizePhotoListPage(value: string | null): number`
  - null/비정수/`< 1` → `1`
  - 그 외 `Number.parseInt` 정수값
- `normalizePhotoListLimit`는 그대로(기본 30, 최대 100).

### 3. 공용 Pager 컴포넌트 (신규 `src/components/Pagination.tsx`)

- 순수 표현 컴포넌트. 서버 컴포넌트에서 렌더 가능(상태/이벤트 없음, `next/link`만).
- Props:
  ```ts
  type PaginationProps = {
    currentPage: number;
    totalPages: number;
    buildHref: (page: number) => string;
  };
  ```
- 렌더:
  - `‹ Prev` — `currentPage > 1`이면 `buildHref(currentPage - 1)` 링크, 1페이지면 비활성(aria-disabled, 링크 아님).
  - 숫자들 — `totalPages <= 10`이면 `1..totalPages` 전부. 초과 시 윈도우: 항상 `1`과 `totalPages`, 현재 페이지 `±2`, 그 사이 끊기는 곳에 `…`(ellipsis). 예: 현재 6/20 → `1 … 4 5 6 7 8 … 20`.
  - `Next ›` — `currentPage < totalPages`이면 링크, 마지막이면 비활성.
  - 현재 페이지 숫자는 링크가 아니라 `aria-current="page"`인 강조 표시.
- `totalPages <= 1`이면 아무것도 렌더하지 않음(null 반환).
- 윈도우 계산은 순수 함수 `getPageWindow(currentPage, totalPages): (number | "ellipsis")[]`로 분리해 단위 테스트 가능하게.

### 4. 소비처

| 파일 | 변경 |
|------|------|
| `src/app/archive/page.tsx` | `searchParams.cursor` → `page`. `getPhotos({ page, ... })`. `nextHref`/More 링크 제거, `<Pagination currentPage totalPages buildHref>` 렌더. `buildHref`는 `tag` 보존 + `page` 설정(`page === 1`이면 param 생략). canonical은 기존대로 `/archive`(또는 `?tag=`). |
| `src/app/admin/photos/page.tsx` | `cursor` → `page`. "Next page" 링크 제거, `<Pagination>` 렌더. `buildHref`는 search/tag/status/visibility/sort/limit 전부 보존 + `page` 설정(1이면 생략). |
| `src/app/api/photos/route.ts` | `searchParams.get("cursor")` → `get("page")`. 응답 `{ items, page, pageSize, total, totalPages }`. |
| `src/app/admin/collections/page.tsx` | `getPhotos({ limit: "100", cursor: null, ... })` → `page: "1"` (cursor 키 제거). pager 없음, 첫 100개 그대로. |
| `src/app/admin/collections/[id]/edit/page.tsx` | 위와 동일. |

> 주: collections 페이지는 100개 초과 시 일부 사진이 선택 목록에 안 나오는 기존 한계가 그대로 유지된다(이번 작업 범위 밖).

### 5. OpenAPI (`src/lib/openapi.ts`)

- `/photos` GET: `cursor` 쿼리 파라미터 → `page` (`{ type: "integer", minimum: 1 }`). summary "List photos with cursor pagination." → "List photos with page-based pagination."
- 응답 스키마: `nextCursor` 제거, `page` / `pageSize` / `total` / `totalPages` (전부 integer) 추가.

### 6. CSS (`src/app/globals.css`)

- 기존 `.pagination-row`(margin-top: 28px)는 유지.
- 신규 `.pagination` 아이템 스타일(디자인 언어 준수 — 무채색, radius 0):
  - 컨테이너: flex, `gap: 4px`, wrap, align center, font 12px.
  - 숫자/화살표 링크: `1px solid var(--line)`, `padding`, `color: var(--muted)`, radius 0, hover 시 `border-color: var(--foreground)`.
  - 현재 페이지(`[aria-current="page"]`): `background: var(--foreground)`, `color: #fff`, border 동일.
  - 비활성 화살표(`[aria-disabled="true"]`): `color: var(--line)`, 커서 default, 링크 아님.
  - `…`(ellipsis): `color: var(--muted)`, border 없음, 클릭 불가.

## Data flow

```
URL ?page=3&tag=street
  → page.tsx reads searchParams.page, tag
  → getPhotos({ page: "3", tag, ... })
      → COUNT(*) → total
      → clamp page, compute offset
      → SELECT ... LIMIT pageSize OFFSET offset
      → { items, page: 3, pageSize: 30, total, totalPages }
  → <Pagination currentPage={3} totalPages={totalPages}
       buildHref={(p) => `/archive?${params(tag, p)}`} />
```

## Error / edge handling

- 비정상 `page`(non-numeric, `< 1`, 빈 값) → `1` (`normalizePhotoListPage`).
- `page > totalPages` → `totalPages`로 clamp, 마지막 페이지 렌더(리다이렉트 없음).
- `total === 0` → `totalPages = 1`, page 1, 빈 상태 메시지(기존 "No public photos..." 유지).
- `totalPages <= 1` → Pagination 컴포넌트는 null 반환(pager 숨김).

## Testing

- **`src/lib/photos.test.ts`** (기존 파일에 추가): `normalizePhotoListPage` — null/0/음수/비정수 → 1, 정상값 파싱.
- **`src/server/photos.test.ts`**: 기존 cursor 기반 테스트를 page 동작으로 갱신.
  - count + page 쿼리 동작(모킹된 query 호출), offset 계산, totalPages 계산, page 범위 clamp, 반환 shape(`{ items, page, pageSize, total, totalPages }`).
- **신규 `src/components/Pagination.test.tsx`**:
  - `getPageWindow`: totalPages ≤ 10이면 전부, > 10이면 양 끝 + 현재±2 + ellipsis.
  - 현재 페이지가 `aria-current="page"`, 링크 아님.
  - 1페이지일 때 Prev 비활성, 마지막 페이지일 때 Next 비활성.
  - `totalPages <= 1`이면 렌더 없음.
  - `buildHref`가 각 숫자에 올바른 href 생성.
- **`src/app/api/photos/route.test.ts`**: 응답 shape이 `{ items, page, pageSize, total, totalPages }`인지, `page` 쿼리 처리.
- 동작을 테스트(구현 디테일 아님). 기존 통과 스위트(101개)는 갱신 후에도 green이어야 함.

## Out of scope

- collections 100개 초과 처리(기존 한계 유지).
- 무한 스크롤, "페이지당 개수" UI 변경(archive는 30 고정, admin은 기존 limit 컨트롤 유지).
- 정렬/필터 기능 자체의 변경.
