# Sukima 배포 가이드

Vercel + Neon Postgres + Cloudflare R2 기준. 이 문서는 코드에서 확인된 사실만 담는다 (env 요구사항은 `src/lib/env.ts`, DB 접근은 `src/lib/db.ts`, R2 흐름은 `src/lib/r2.ts` 기준).

## 스택 개요

- **앱**: Next.js 14 (App Router). 목록/상세/admin은 `force-dynamic` — 빌드 시 DB 불필요. `sitemap.xml`은 dynamic이며 DB 실패 시 빈 배열로 폴백.
- **DB**: Postgres. 앱은 `pg.Pool`로 접속(`src/lib/db.ts`). 스키마는 `db/schema.sql` + `db/migrations/`. **자동 마이그레이션 러너 없음 — 수동 적용.**
- **스토리지**: Cloudflare R2 (S3 호환). 버킷 2개 — private(원본), public(처리된 공개 이미지).
- **인증**: 단일 admin. HMAC-SHA256 세션 쿠키 + 상수시간 비교(`src/lib/auth.ts`).

## 환경변수

Vercel 프로젝트 → Settings → Environment Variables(Production)에 등록.

| 변수 | 필수 | 설명 |
|------|:---:|------|
| `DATABASE_URL` | ✅ | Postgres 연결 문자열. **Neon은 pooled(`-pooler`) 엔드포인트 사용** (함정 1). |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare 계정 ID. R2 endpoint 구성에 사용. |
| `R2_ACCESS_KEY_ID` | ✅ | R2 API 토큰의 access key. |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 API 토큰의 secret. |
| `R2_BUCKET_PRIVATE` | ✅ | 원본 저장 버킷 이름. presigned 업로드 대상. |
| `R2_BUCKET_PUBLIC` | ✅ | 처리된 공개 이미지 버킷 이름. |
| `ADMIN_EMAIL` | ✅ | admin 로그인 이메일. |
| `ADMIN_PASSWORD` | ✅ | admin 로그인 비밀번호. 강하게. |
| `AUTH_SECRET` | ✅ | 세션 토큰 서명용 시크릿. 길고 랜덤하게(예: `openssl rand -base64 32`). |
| `R2_PUBLIC_BASE_URL` | 사실상 필수 | public 버킷의 공개 도메인. 없으면 공개 이미지 URL이 안 만들어진다(함정 3a). |
| `NEXT_PUBLIC_SITE_URL` | 사실상 필수 | 서비스 절대 URL. 없으면 canonical/OG가 `http://localhost:3000`으로 폴백(함정 2). |

> 필수 9개 중 하나라도 없으면 해당 기능 요청 시 런타임에서 `Missing environment variable: X`로 throw(`src/lib/env.ts`). 빌드는 통과하므로 배포 후에야 드러난다.

## 배포 절차

### 1. 프로덕션 DB에 스키마 적용

빈 DB라면 스키마와 마이그레이션을 순서대로 적용:

```bash
psql "$PROD_DATABASE_URL" -f db/schema.sql
psql "$PROD_DATABASE_URL" -f db/migrations/2026-05-27-photo-assets.sql
```

> 마이그레이션은 `db/migrations/` 안의 파일을 **파일명(날짜) 순서대로** 적용한다. 새 마이그레이션이 추가되면 동일하게 수동 적용.

### 2. 코드를 GitHub에 push

```bash
git push -u origin main
```

### 3. Vercel 프로젝트 생성

1. Vercel에서 GitHub repo(`khe0124/sukima`) import → Next.js 자동 감지(추가 빌드 설정 불필요).
2. 위 환경변수 전부 등록(Production). `NEXT_PUBLIC_SITE_URL`은 **첫 빌드 전에** 반드시 등록(함정 2).
3. Deploy.

### 4. 배포 후 스모크 테스트

순서대로 하면 각 함정을 한 번씩 검증한다:

1. `/admin` 로그인 — `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`AUTH_SECRET` 검증.
2. 사진 1장 업로드 — presigned PUT(→ private 버킷)과 이미지 처리 검증. 실패 시 함정 3b(CORS) 의심.
3. `/archive`에서 그 사진 표시 — `R2_PUBLIC_BASE_URL`/public 버킷 공개 검증. 깨지면 함정 3a.
4. 페이지 소스에서 `<link rel="canonical">`이 실제 도메인인지 — 함정 2 검증.
5. `/sitemap.xml`, `/robots.txt` 응답 확인.

## 함정 3개 (배포 후에야 드러나는 것들)

빌드·기본 동작은 통과하지만 프로덕션에서 깨진다.

### 함정 1 — Neon pooled 연결 문자열

`src/lib/db.ts`는 모듈 레벨 `pg.Pool`을 쓴다. Vercel 서버리스는 요청을 독립 인스턴스에서 처리하고 부하 시 동시에 수십 개를 띄운다. 인스턴스마다 Pool이 직접 커넥션을 잡아 Postgres 커넥션 한도를 초과한다.

- **증상**: 부하/동시요청 시 `too many connections` / `remaining connection slots are reserved` / 간헐 500.
- **해결**: Neon 대시보드에서 **Pooled connection**(호스트에 `-pooler` 포함) 문자열을 `DATABASE_URL`로 사용. 선택적으로 `src/lib/db.ts`의 Pool에 `max: 1~3`을 줘 인스턴스당 커넥션도 제한.

### 함정 2 — `NEXT_PUBLIC_SITE_URL`은 빌드 타임에 박힌다

`NEXT_PUBLIC_` env는 런타임이 아니라 빌드 시점에 코드로 치환된다. `src/lib/seo.ts`의 `getSiteUrl()`이 이 값을 읽고, 없으면 `http://localhost:3000`으로 폴백.

- **증상**: 화면은 정상인데 canonical/OG/sitemap의 도메인이 localhost. 잘못된 URL 형식이면 빌드 throw.
- **해결**: Vercel env에 빌드 전에 `NEXT_PUBLIC_SITE_URL=https://실제도메인` 등록. **값 변경 시 재배포(rebuild) 필요** — 런타임 재시작만으론 안 바뀐다.

### 함정 3 — R2 public 접근 + private 버킷 CORS

별개의 두 설정이고 각각 다른 버킷이다.

**(a) public 버킷 공개 읽기.** `toPublicPhotoUrl`(`src/lib/photos.ts`)이 `${R2_PUBLIC_BASE_URL}/${key}`로 이미지 URL을 만든다. public 버킷이 공개(r2.dev 도메인 또는 커스텀 도메인)여야 한다.
- **증상**: `/archive` 이미지 전부 403/깨짐.

**(b) private 버킷 업로드 CORS.** 업로드는 서버를 거치지 않는다 — `/api/photos/upload-url`이 presigned PUT URL을 발급하고(대상 = **private 버킷**, `src/lib/r2.ts`), 브라우저가 R2로 직접 PUT한다. private 버킷에 CORS가 없으면 브라우저 preflight에서 막힌다.
- **증상**: admin 업로드 시 R2로 가는 PUT이 CORS 에러로 실패. 앱 로그엔 안 남음.
- **해결**: private 버킷 CORS에 사이트 origin의 PUT 허용:

```json
[
  {
    "AllowedOrigins": ["https://실제도메인"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

> 서버가 직접 쓰는 public 버킷 PUT(이미지 처리 결과 저장, `src/lib/r2.ts`)은 서버→R2라 CORS 불필요.

## 주의할 점 (운영)

함정 3개와 별개로, 배포 전후에 알아둘 것들.

### 꼭 보고 갈 것

**이미지 처리 타임아웃.** 업로드는 파일마다 `/api/photos/[id]/process`를 호출하고, 이 route는 `processPhoto`를 동기로 실행한다 — 원본 + 모든 추가 asset에 sharp를 돌리고 R2에 쓴다(`src/server/photos.ts`). 큰 이미지나 여러 장이면 시간이 길어진다.
- route에 `export const maxDuration = 60`을 설정해 둠(`src/app/api/photos/[id]/process/route.ts`). **단 60초 이상은 Vercel 플랜에 따라 다르다**(Hobby는 상한이 낮음) — 플랜 한도 확인.
- 부분 실패: 업로드·메타 저장은 됐는데 처리가 끊기면 photo가 `processing`/`failed`로 남는다. admin의 status=failed 필터에서 재처리.
- 한 번에 적당한 크기·수량으로. 장기적으론 백그라운드 큐 검토.

**로그인 brute-force 보호 없음.** rate limiting/throttle 코드가 없다. `/api/admin/login`은 same-origin 체크만 한다 → 단일 `ADMIN_PASSWORD`가 사실상 유일한 방어선.
- `ADMIN_PASSWORD`를 아주 강하게, `AUTH_SECRET`은 `openssl rand -base64 32` 수준 랜덤.
- 앞단에 Cloudflare/Vercel WAF·rate limit 검토.

### 알아두면 좋은 것

- **`AUTH_SECRET` 회전 = 즉시 로그아웃.** 세션이 이 시크릿으로 서명되므로(`src/lib/auth.ts`) 바꾸면 기존 세션 전부 무효. 강제 로그아웃 수단이기도.
- **`force-dynamic` = 매 요청 DB 조회, HTML 캐싱 없음.** archive/collections가 전부 dynamic이라 페이지뷰마다 쿼리가 돈다. Neon scale-to-zero면 idle 후 첫 요청에 cold start 지연. **Neon region을 Vercel 함수 region과 가깝게** 둘 것(한국 대상이면 둘 다 ap-northeast 계열). 트래픽이 늘면 ISR/`revalidate` 검토.
- **R2 토큰 스코프 + 원본 백업.** API 토큰이 private·public **두 버킷 모두** read/write여야 한다(한쪽만이면 업로드 또는 표시 실패). private 버킷 원본은 재처리의 원천 — lifecycle 규칙으로 자동 삭제되지 않게 + 백업 정책 확인.
- **secrets 위생.** `.env.local`은 커밋 금지(gitignore로 막혀 있음). 프로덕션 값은 Vercel env에만. 로그/에러에 secret 노출 주의.

## 재배포 / 롤백

- **재배포**: main에 push하면 Vercel이 자동 빌드·배포.
- **env 변경 후**: `NEXT_PUBLIC_*`를 바꿨다면 반드시 redeploy(빌드 인라인이라).
- **롤백**: Vercel 대시보드 Deployments에서 이전 성공 배포를 Promote/Rollback. DB 스키마 변경을 동반한 배포는 롤백 시 스키마 호환성 확인 필요.

## 새 마이그레이션 추가 시

1. `db/migrations/YYYY-MM-DD-<name>.sql` 생성.
2. 배포 전 프로덕션 DB에 `psql "$PROD_DATABASE_URL" -f db/migrations/<file>.sql` 적용.
3. 코드와 스키마 변경의 적용 순서 주의 — 컬럼 추가는 코드 배포 전, 컬럼 삭제는 코드 배포 후가 안전.

## 참고

- 보안 하드닝: `docs/security-hardening.md`
- API 스펙: 배포 후 `/api/openapi.json`, admin의 `/admin/api-docs`
