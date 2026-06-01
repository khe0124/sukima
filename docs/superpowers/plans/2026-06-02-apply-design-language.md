# Apply Photo-First Achromatic Design Language — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DESIGN.md`에 정의한 디자인 언어(무채색 화이트큐브 + serif 24px 타이틀 + 12px 본문 + 라운드 0)를 실제 코드에 적용한다.

**Architecture:** 변경의 대부분은 `src/app/globals.css`의 CSS 변수와 base/component 스타일이다. `--accent`(teal→ink), `--background`(beige→white) 두 토큰을 바꾸면 `var()`를 참조하는 인라인 Tailwind 클래스 대부분이 자동으로 무채색이 된다. 나머지는 타이포 스케일 축소, `border-radius` 일괄 0, 그리고 토큰을 쓰지 않는 인라인 잔재(`rounded-full` 등) 정리다.

**Tech Stack:** Next.js 14 (App Router), Tailwind 4 (`@import "tailwindcss"`), 손으로 쓴 CSS in `globals.css`, Cormorant + Inter (next/font).

**검증 방식 (중요):** 이 작업은 순수 스타일 마이그레이션이다. CSS 값(색·radius·font-size)을 단언하는 unit test는 구현 디테일 테스트라 쓰지 않는다. 대신 각 태스크마다 **기존 테스트 스위트 무결성(`npm test`) + lint(`npm run lint`) + typecheck(`npx tsc --noEmit`)** 를 회귀 가드로 돌리고, 마지막에 dev 서버로 육안 확인한다. 현재 어떤 테스트도 색/스타일 값을 단언하지 않으므로 토큰 교체로 테스트가 깨지면 안 된다(깨지면 그 자체가 버그 신호).

---

## File Structure

- **Modify:** `src/app/globals.css` — 토큰(`:root`), base typography(`body`/`h1`/`h2`/`p`/`.eyebrow`), 버튼 타이포, 모든 `border-radius`. (변경의 90%)
- **Modify:** `src/app/archive/[slug]/page.tsx:123` — 태그 pill의 `rounded-full` 제거 + 폰트 크기 정렬.
- **Modify:** `src/app/archive/ViewedPhoto.tsx:146-159` — tile 캡션/태그 폰트 크기를 12px 스케일에 정렬.
- **변경 없음:** `src/app/layout.tsx` (폰트 셋업 그대로), 관리자 폼 컴포넌트의 개별 `font-size`(기능 UI, 이번 범위 밖 — 의도적으로 둔다).

---

## Task 1: Color tokens (teal → ink, beige → white)

**Files:**
- Modify: `src/app/globals.css:3-13`

- [ ] **Step 1: `:root` 토큰 블록 교체**

기존 (`src/app/globals.css:3-13`):

```css
:root {
  color-scheme: light;
  --background: #f7f5f1;
  --foreground: #1f2933;
  --muted: #667085;
  --line: #d8d2c7;
  --surface: #ffffff;
  --accent: #205a66;
  --danger: #b42318;
  --focus: color-mix(in srgb, var(--accent), transparent 65%);
}
```

교체:

```css
:root {
  color-scheme: light;
  --background: #ffffff;
  --foreground: #141414;
  --muted: #6e6e6e;
  --line: #e2e2e2;
  --surface: #ffffff;
  --accent: #141414;
  --danger: #b42318;
  --focus: color-mix(in srgb, var(--foreground), transparent 70%);
}
```

핵심: `--accent`를 `--foreground`와 같은 잉크값으로 두면 teal에 의존하던 링크·버튼·선택 상태가 전부 무채색이 된다. `--focus`는 accent가 아니라 foreground 기준으로 변경(accent가 무채색이라 결과는 같지만 의미를 명확히).

- [ ] **Step 2: lint + typecheck + test**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: 전부 PASS (어떤 테스트도 색값을 단언하지 않으므로 영향 없음).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): replace teal accent and beige bg with achromatic tokens"
```

---

## Task 2: Base typography (작고 단단하게)

**Files:**
- Modify: `src/app/globals.css:19-26` (body), `:46-56` (.eyebrow), `:58-66` (h1), `:68-73` (h2/h3), `:75-78` (p)

- [ ] **Step 1: `body`에 base font-size/weight 추가**

기존 (`src/app/globals.css:19-26`):

```css
body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), "Inter", sans-serif;
  font-optical-sizing: auto;
  font-style: normal;
}
```

교체:

```css
body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), "Inter", sans-serif;
  font-size: 0.75rem;
  font-weight: 300;
  font-optical-sizing: auto;
  font-style: normal;
}
```

- [ ] **Step 2: `.eyebrow` 교체 (serif/teal → Inter 10px 600 .22em muted)**

기존 (`src/app/globals.css:46-56`):

```css
.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-family: var(--font-cormorant), "Cormorant", serif;
  font-optical-sizing: auto;
  font-style: normal;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}
```

교체:

```css
.eyebrow {
  margin: 0 0 8px;
  color: var(--muted);
  font-family: var(--font-inter), "Inter", sans-serif;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
```

- [ ] **Step 3: `h1` 교체 (clamp 3.5rem → 24px/600)**

기존 (`src/app/globals.css:58-66`):

```css
h1 {
  margin: 0 0 12px;
  font-family: var(--font-cormorant), "Cormorant", serif;
  font-optical-sizing: auto;
  font-style: normal;
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1;
  letter-spacing: 0;
}
```

교체:

```css
h1 {
  margin: 0 0 12px;
  font-family: var(--font-cormorant), "Cormorant", serif;
  font-optical-sizing: auto;
  font-style: normal;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 4: `h2`/`h3`에 h2 크기 추가**

기존 (`src/app/globals.css:68-73`):

```css
h2,
h3 {
  font-family: var(--font-cormorant), "Cormorant", serif;
  font-optical-sizing: auto;
  font-style: normal;
}
```

교체 (블록 유지 + h2 규칙 추가):

```css
h2,
h3 {
  font-family: var(--font-cormorant), "Cormorant", serif;
  font-optical-sizing: auto;
  font-style: normal;
}

h2 {
  font-size: 1rem;
  font-weight: 600;
}
```

> 주: 일부 컴포넌트(`.admin-photo-row h2`, `.api-docs-card h2` 등)는 자체 `font-size`로 이미 override 하고 있어 영향받지 않는다. DESIGN.md에서 h2(16px)는 "파생 기본값"으로 표시된 값이다.

- [ ] **Step 5: `p` 교체 (12px/300)**

기존 (`src/app/globals.css:75-78`):

```css
p {
  color: var(--muted);
  line-height: 1.6;
}
```

교체:

```css
p {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 300;
  line-height: 1.65;
}
```

- [ ] **Step 6: lint + typecheck + test**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: 전부 PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): shrink type scale to 24px titles and 12px body"
```

---

## Task 3: Button typography (approved mockup에 맞춤)

**Files:**
- Modify: `src/app/globals.css` — `.upload-form button, .inline-form button, .manager-row button` 블록(약 519-542), `.button-link` 블록(약 977-998)

> 목표: 승인된 목업의 버튼(12px/500)에 맞춘다. 현재 `font-size: 0.875rem; font-weight: 700`을 `0.75rem`/`500`으로.

- [ ] **Step 1: 메인 버튼 규칙의 font 변경**

`.upload-form button, .inline-form button, .manager-row button` 블록에서:

기존:

```css
  padding: 0 14px;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
```

교체:

```css
  padding: 0 14px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
```

- [ ] **Step 2: `.button-link` 규칙의 font 변경**

`.button-link` 블록에서:

기존:

```css
  padding: 0 14px;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
```

교체:

```css
  padding: 0 14px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
```

> `.plain-button`(font-size 0.875rem / weight 750)은 관리자 전용 액션이라 이번 범위 밖. 그대로 둔다. 두 블록만 변경 후 `grep -n "font-size: 0.875rem" src/app/globals.css`로 남은 건 `.plain-button` 하나뿐인지 확인.

- [ ] **Step 3: lint + typecheck + test**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: 전부 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): set button type to 12px/500 per approved mockup"
```

---

## Task 4: Remove all border-radius (라운드 0, 샤프)

**Files:**
- Modify: `src/app/globals.css` — 25개 `border-radius` 선언 전부

> globals.css의 `border-radius` 값 분포: `4px`×2, `6px`×10, `8px`×10, `999px`×3. 전부 `0`으로. 균일 변환이므로 값별 일괄 치환한다.

- [ ] **Step 1: 변환 전 현황 확인**

Run: `grep -o "border-radius: [^;]*" src/app/globals.css | sort | uniq -c`
Expected: `2 border-radius: 4px`, `10 border-radius: 6px`, `10 border-radius: 8px`, `3 border-radius: 999px`

- [ ] **Step 2: 값별 일괄 치환 (Edit 도구의 replace_all 사용, 4회)**

각각 `replace_all: true`로:
- `border-radius: 4px` → `border-radius: 0`
- `border-radius: 6px` → `border-radius: 0`
- `border-radius: 8px` → `border-radius: 0`
- `border-radius: 999px` → `border-radius: 0`

> `999px`는 pill 형태였던 `.form-status`, `.api-docs-section-header > span`, `.api-docs-method` 3곳. DESIGN.md대로 사각 보더가 된다.

- [ ] **Step 3: 변환 결과 확인**

Run: `grep -c "border-radius: 0" src/app/globals.css; grep -c "border-radius: [^0]" src/app/globals.css`
Expected: 첫 줄 `25`, 둘째 줄 `0` (0이 아닌 radius가 남아있지 않아야 함).

- [ ] **Step 4: lint + typecheck + test**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): flatten all border-radius to 0 for gallery sharpness"
```

---

## Task 5: Inline Tailwind 잔재 정리

**Files:**
- Modify: `src/app/archive/[slug]/page.tsx:123`
- Modify: `src/app/archive/ViewedPhoto.tsx:146-159`

- [ ] **Step 1: 태그 pill의 `rounded-full` 제거 + 폰트 정렬**

`src/app/archive/[slug]/page.tsx:123`

기존:

```tsx
                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-[5px] text-[0.9rem] text-[var(--muted)]"
```

교체 (`rounded-full` 삭제, `text-[0.9rem]` → `text-[0.75rem]`):

```tsx
                className="border border-[var(--line)] bg-[var(--surface)] px-2.5 py-[5px] text-[0.75rem] text-[var(--muted)]"
```

- [ ] **Step 2: tile 캡션/태그 폰트를 12px 스케일에 정렬**

`src/app/archive/ViewedPhoto.tsx` — `ViewedPhotoTile`의 캡션 span(약 146행)과 태그 span(약 153행).

기존 (캡션):

```tsx
      <span className="min-h-[1.4em] text-[0.92rem] text-[var(--muted)] [overflow-wrap:anywhere]">
        {photo.title || "Untitled"}
      </span>
```

교체 (`text-[0.92rem]` → `text-[0.75rem]`):

```tsx
      <span className="min-h-[1.4em] text-[0.75rem] text-[var(--muted)] [overflow-wrap:anywhere]">
        {photo.title || "Untitled"}
      </span>
```

기존 (태그):

```tsx
        <span className="flex flex-wrap gap-1.5 text-[0.78rem] text-[var(--muted)]">
```

교체 (`text-[0.78rem]` → `text-[0.6875rem]`, DESIGN의 caption 11px):

```tsx
        <span className="flex flex-wrap gap-1.5 text-[0.6875rem] text-[var(--muted)]">
```

- [ ] **Step 3: 남은 `rounded` 잔재 없는지 확인**

Run: `grep -rn "rounded" src/app`
Expected: 출력 없음 (모든 인라인 라운드 제거됨).

- [ ] **Step 4: lint + typecheck + test**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/archive/[slug]/page.tsx src/app/archive/ViewedPhoto.tsx
git commit -m "feat(design): remove pill radius and align tile type to 12px scale"
```

---

## Task 6: 육안 검증 (dev 서버)

**Files:** 없음 (검증 전용)

- [ ] **Step 1: dev 서버 기동**

Run: `npm run dev`
Expected: `http://localhost:3000` 기동.

- [ ] **Step 2: 화면별 확인 체크리스트**

브라우저로 다음을 확인:
- `/` (홈) — 배경 순백, 타이틀 24px serif, 본문 12px, 버튼 잉크 블랙·직각, teal 흔적 없음
- `/archive` — 사진 그리드가 주인공, 캡션 12px, eyebrow 대문자 회색
- `/archive/[slug]` (사진 하나 진입) — 태그가 사각 보더, 라운드 없음
- `/collections` — 카드 보더 1px, 라운드 없음
- `/admin/photos` (로그인 필요 시 건너뛰기 가능) — 폼/버튼 직각, danger 버튼만 빨강 유지

- [ ] **Step 3: 잔여 teal/beige 전수 확인**

Run: `grep -rn "205a66\|f7f5f1\|1f2933\|d8d2c7\|667085\|teal" src/`
Expected: 출력 없음 (하드코딩된 옛 색이 남아있지 않아야 함). 단, `src/app/globals.css`의 `.api-docs-method[data-method]`에 하드코딩된 `#205a66`/`#6f5428`가 있으면 무채색(`var(--muted)`/`var(--foreground)`)으로 교체 후 재커밋.

- [ ] **Step 4: 최종 점검**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: 전부 PASS. 끝.

---

## Self-Review (작성자 체크)

- **Spec coverage:** DESIGN.md의 Color tokens(Task 1), Typography(Task 2·3·5), Shape/radius(Task 4), Components 버튼/pill(Task 3·5), Migration notes의 인라인 잔재(Task 5)·하드코딩 색(Task 6 Step 3) 모두 태스크로 커버됨. Out of scope(다크모드/모션/아이콘)는 손대지 않음.
- **Placeholder scan:** TBD/TODO 없음. 모든 CSS 편집은 old/new 블록으로 명시. radius는 균일 변환이라 값별 replace_all로 정확히 지정.
- **누락 주의:** Task 6 Step 3에서 `.api-docs-method`의 하드코딩 `#205a66`(teal)/`#6f5428` 발견 가능성 — 발견 시 무채색 교체하도록 명시함. (globals.css:893-908 참고)
