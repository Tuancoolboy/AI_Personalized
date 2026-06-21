# Next.js Backend Clone

Thư mục này giữ **bản clone tham chiếu** của backend hiện đang sống trong Next.js:

- `frontend/app/api/**`
- `frontend/app/moi/[token]/accept/route.ts`
- toàn bộ `frontend/lib/**` phụ thuộc trực tiếp hoặc gián tiếp từ các route trên

Mục tiêu của clone này:

- gom toàn bộ BE/API source hiện tại vào `src/backend/` để chuẩn bị tách backend;
- giữ một snapshot song song mà **không thay** runtime Next.js hiện đang dùng;
- làm nguồn đối chiếu khi native hóa từng endpoint FastAPI sau này.

Sync lại bằng:

```bash
node scripts/clone-next-backend-to-fastapi.mjs
```

Manifest file nằm ở `src/backend/next_clone/manifest.json`.
