# Production Deployment

> Source of truth: 25/06/2026

## Canonical production URL

https://c2-app-009.vercel.app

- Vercel project: `c2-app-009`
- Framework preset: Next.js
- Production source: branch `main`
- Deploy method: GitHub Actions/Vercel CLI
- Deployment verified 25/06/2026:
  `c2-app-009-mxjakoekc-hai-dangs-projects-cf419357.vercel.app`

Không dùng `ai-tro-ly.vercel.app` làm production URL. Alias này đã được gỡ ngày
25/06/2026.

## Verify current deployment

```bash
./scripts/check-vercel-deployments.sh
vercel alias list
curl -I https://c2-app-009.vercel.app
```

Sau mỗi production deployment, xác nhận alias canonical trỏ đúng deployment
`main` mới nhất:

```bash
vercel alias set <deployment-url> c2-app-009.vercel.app
```

`NEXT_PUBLIC_*` variables must be present during **remote build**. A local
`vercel build --prod` + `vercel deploy --prebuilt` cannot reliably materialize
encrypted Vercel values into a public Next.js bundle. The CD workflow therefore
uses a remote build:

```bash
vercel deploy --prod --yes
```

Then reassign the canonical alias and remove any legacy alias.

The repository CD workflow and `scripts/deploy-vercel-prod.sh` both enforce:

- canonical alias: `c2-app-009.vercel.app`;
- remove legacy alias: `ai-tro-ly.vercel.app`.

## Future custom domain

Target: `https://c2-app-009.io.vn`

Chỉ chuyển khi team có quyền quản lý DNS:

1. Add `c2-app-009.io.vn` trong Vercel Project → Domains.
2. Tạo DNS record theo hướng dẫn Vercel.
3. Chờ SSL ở trạng thái valid.
4. Cập nhật `NEXT_PUBLIC_APP_URL`.
5. Cập nhật Supabase Auth Site URL + Redirect URLs.
6. Cập nhật Google OAuth redirect URLs nếu đang dùng.
7. Redeploy production.
8. Smoke login/register/chat/invite/email links.
9. Giữ `c2-app-009.vercel.app` làm fallback hoặc redirect trong giai đoạn chuyển.

Không đổi domain chỉ bằng code trước khi DNS và OAuth/Supabase callbacks sẵn
sàng.
