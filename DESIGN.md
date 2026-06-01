# Sukima — Design Language

사진 아카이브의 디자인 언어. 단 하나의 원칙에서 출발한다: **색을 가진 것은 사진뿐이다.**
UI는 무채색의 화이트큐브로 물러나 사진을 받친다. 장식이 아니라 절제로 완성한다.

## Principles

1. **사진 우선** — UI의 색·보더·라운드가 사진보다 시선을 끌면 실패다. 위계는 색이 아니라 여백과 타이포로 만든다.
2. **무채색** — 화면에 chromatic accent는 없다. 잉크 블랙 한 단계와 회색 단계만으로 위계를 잡는다. 예외는 `danger` 하나 — 색이 아니라 파괴적 동작의 기능 신호다.
3. **작고 단단하게** — 비대한 타입을 쓰지 않는다. 타이틀 24px, 본문 12px. 정보 밀도는 높지만 여백으로 숨 쉰다.
4. **샤프** — 라운드 코너 없음(`0`). 갤러리의 직각 프레임 톤.

## Color tokens

`src/app/globals.css`의 `:root`에 정의한다. 기존 변수명을 유지하되 값만 교체한다.

```css
:root {
  color-scheme: light;
  --background: #ffffff;  /* 순백. 페이지 전체 배경 */
  --foreground: #141414;  /* 잉크. 본문 강조·헤딩·기본 버튼 */
  --muted: #6e6e6e;       /* 보조 텍스트, 캡션, 메타데이터 */
  --line: #e2e2e2;        /* 보더, 구분선 */
  --surface: #ffffff;     /* 카드·인풋 배경. 배경과 같고 보더로 분리한다 */
  --accent: #141414;      /* accent = 잉크 블랙. chromatic 없음. 링크·primary 버튼 */
  --danger: #b42318;      /* 파괴적 동작(삭제)에만. 유일한 유채색 */
  --focus: color-mix(in srgb, var(--foreground), transparent 70%);
}
```

- **`--accent`를 `--foreground`와 같은 값으로 두는 게 핵심.** teal을 잉크로 바꾸는 것만으로 기존 코드 대부분이 자동으로 무채색이 된다.
- `--surface`가 `--background`와 동일하므로, 카드/패널은 배경색이 아니라 **`--line` 1px 보더**로만 구분한다.
- hover/selected 상태의 틴트는 `color-mix(... var(--accent), transparent N%)`를 그대로 쓰면 회색 틴트가 된다 (accent가 무채색이므로). teal 틴트가 회색 틴트로 자동 전환됨.

## Typography

폰트는 현재 셋업 유지: 헤딩 **Cormorant**(serif), 본문 **Inter**(sans). `--font-cormorant`, `--font-inter` CSS 변수 그대로.

| 역할 | 폰트 | 크기 | 무게 | 비고 |
|------|------|------|------|------|
| Eyebrow / label | Inter | 10px | 600 | `letter-spacing: .22em`, `uppercase`, color `--muted` |
| Title (h1) | Cormorant | 24px | 600 | `line-height: 1.15`, `letter-spacing: -.01em` |
| Section heading (h2) | Cormorant | 16px | 600 | h1 아래 단계. *(파생 기본값 — 조정 가능)* |
| Body | Inter | 12px | 300 | `line-height: 1.65`, color `--muted` |
| Body strong | Inter | 12px | 400 | 본문 강조, color `--foreground` |
| Caption / small | Inter | 11px | 400 | 메타데이터, color `--muted`. *(파생 기본값)* |

- **타이틀은 24px semibold로 고정.** 기존 `h1`의 `clamp(2rem, 4vw, 3.5rem)`를 버린다 — 비대했다.
- 본문 기본은 12px/300. 가벼운 무게가 화이트큐브 톤을 만든다. 가독성이 필요한 강조는 400으로 올린다.
- h2/caption은 위 두 스펙에서 파생한 합리적 기본값이다. 실제 화면에서 어색하면 조정한다.

## Shape & spacing

- **Border radius: `0`.** 버튼·인풋·카드·이미지 타일 전부 직각. 기존 `border-radius: 6px~8px`, `999px`(pill) 전부 제거. (pill 형태의 status/badge도 사각 보더로.)
- **Border: `1px solid var(--line)`** 가 분리의 기본 수단. 그림자·배경색 대비 대신 얇은 선.
- 레이아웃 폭: 기존 `.shell`(min(920px, ...)), 아카이브(min(1180px, ...)) 유지.
- 그리드 갭: 사진 그리드는 8px 내외로 촘촘히 — 사진끼리 붙어 인덱스처럼 읽히게.

## Components

| 컴포넌트 | 규칙 |
|----------|------|
| Primary button | bg `--accent`(잉크), text `#fff`, radius 0, Inter 500 12px. hover: `color-mix(--accent, black 8%)` |
| Secondary button | bg transparent/`--surface`, `1px solid --line`, text `--foreground`. hover: 옅은 회색 배경 |
| Danger button | bg `--danger`, text `#fff`. 삭제 등 파괴적 동작에만 |
| Input / select / textarea | bg `--surface`, `1px solid --line`, radius 0. focus: `--focus` 아웃라인 |
| Card / panel | `1px solid --line`, 배경색 없음(=흰색), radius 0 |
| Link | color `--accent`(잉크). 본문 내 링크는 underline으로 구분 |
| Selected state | `--accent` 보더 + `color-mix(--accent, transparent 90%)` 회색 틴트 |
| Focus ring | `outline: 2px solid var(--focus)` (얇게) |

## Migration notes

현재 스타일에서 이 언어로 옮길 때 영향받는 곳:

- `src/app/globals.css` — `:root` 토큰 교체, 모든 `border-radius` → 0, `h1` 크기, 본문/타이포 스펙. 가장 큰 변경.
- `src/app/layout.tsx` — 폰트 셋업 유지(변경 없음).
- 인라인 Tailwind 유틸을 쓰는 곳(`page.tsx`, `archive/page.tsx`의 `rounded-*`, `gap-*` 등) — 라운드 유틸 제거, 그리드 갭 조정.
- danger를 제외한 모든 색 신호가 무채색으로 바뀌므로, teal에 의존하던 시각적 구분(예: 선택·활성 상태)이 약해지는 곳이 없는지 화면별로 확인.

## Out of scope

- 다크 모드 (지금은 light 전용)
- 애니메이션·모션 시스템 (기존 140ms transition 유지)
- 아이콘 세트
