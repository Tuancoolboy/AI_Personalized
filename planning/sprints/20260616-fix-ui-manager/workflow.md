# Workflow — Fix UI Manager

Owner: Tuancoolboy
Branch: `feat/tuanvh/fix-UI-manager`
Date: 2026-06-16

## Checklist

- [x] Đọc specs/source of truth
- [x] Tạo branch
- [x] Sửa UI nhân viên
- [x] Sửa UI setting/công cụ AI
- [x] Cập nhật WORKLOG
- [x] Cập nhật PROJECT-CONTINUATION
- [ ] lint/test/build — `npm run lint` pass; Node 20 Vitest pass; Node 20 build pass; full `npm run test` còn fail 2 API chat checks ngoài scope
- [x] Review diff

## Notes

- Visual reference: `specs/gemini-code-1781627827649.html`.
- Scope: presentation for `/quan-ly/nhan-vien` and `/quan-ly/cai-dat`.
- Không đổi Supabase schema, auth guard, API route, hoặc dữ liệu manager.
- Existing chat file changes were preserved in `stash@{0}` because they conflicted with the pulled `develop`.
