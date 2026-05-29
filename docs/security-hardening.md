# Security Hardening Notes

## Implemented

### Admin mutation origin checks

Admin state-changing API routes now verify that the request comes from the same site origin before processing the mutation.

Covered routes:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `POST /api/photos/upload-url`
- `POST /api/photos`
- `PATCH /api/photos/:id`
- `DELETE /api/photos/:id`
- `POST /api/photos/:id/process`
- `POST /api/tags`
- `PATCH /api/tags/:id`
- `DELETE /api/tags/:id`
- `POST /api/collections`
- `PATCH /api/collections/:id`
- `DELETE /api/collections/:id`
- `PUT /api/collections/:id/photos`

Why this exists:

The admin session is stored in an HTTP-only cookie. Cookies are useful because the browser can keep the session token out of JavaScript, but they also mean a malicious external page can attempt to trigger cookie-authenticated requests. Checking `Origin` or `Referer` rejects cross-site mutation attempts before the API changes photo, tag, collection, or session state.

Implementation detail:

- The current request origin is always allowed.
- `NEXT_PUBLIC_SITE_URL`, when configured, is also accepted as the canonical production origin.
- In production, requests without both `Origin` and `Referer` are rejected.
- In development and tests, missing `Origin` and `Referer` are allowed so local curl and route tests remain usable.

### Signed URL responses are non-cacheable

The upload URL and original download URL endpoints now return:

```txt
Cache-Control: no-store
```

Covered routes:

- `POST /api/photos/upload-url`
- `GET /api/photos/:id/download-url`

Why this exists:

Presigned R2 URLs are temporary credentials for one object operation. They should not be stored by browser caches, shared proxies, or debugging middleware. `no-store` reduces the chance that a still-valid upload or download URL is replayed from cache or exposed through cached responses.

## Operational Notes

Set `NEXT_PUBLIC_SITE_URL` to the exact production site origin, for example:

```txt
https://example.com
```

Do not include a path. The origin must match the browser origin used by the deployed admin UI.

If the site is served from multiple admin origins, add a deliberate allowlist before deployment. Do not use broad wildcard origins for admin APIs.

## Remaining Security Work

Recommended next steps, in order:

1. Add rate limiting to `POST /api/admin/login`.
2. Verify R2 object existence and metadata before creating the photo DB record.
3. Add stronger image processing safety limits around file size, pixel dimensions, and processing failures.
4. Add application security headers in Next.js middleware or config.
5. Review logs to ensure signed URLs, private storage keys, and secrets are not printed.
