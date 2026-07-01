# Audit `/van-hanh` dưới góc nhìn người vận hành — 2026-06-20

## Phạm vi

- Trang `/van-hanh/login` và `/van-hanh`.
- API `/api/platform-admin` GET/POST.
- Proxy redirect cho `platform_admin`, manager, employee.
- 6 tab console: Tổng quan, Tổ chức, Người dùng, Nội dung, AI & usage, Nhật ký.

## Kết quả sửa chính

| Hạng mục | Kỳ vọng | Thực tế trước audit | Đạt/Lỗi | Đã sửa |
| --- | --- | --- | --- | --- |
| Nav của platform admin | Operator chỉ thấy nav vận hành, không lẫn manager/employee | Nav trộn `/van-hanh`, `/quan-ly`, manager nav và employee nav; label trùng như `Lộ trình` | Lỗi | Tách `OPERATOR_NAV`, platform admin chỉ còn `Vận hành`; `uniqueNavItems` dedupe theo href và label |
| Pill vai trò cạnh logo | Không hiện pill `Quản lý` sai ngữ cảnh cho operator | Platform admin bị render như manager nên thấy pill `Quản lý` | Lỗi | Thêm `showRolePill`, ẩn pill cho platform admin |
| Operator vào route học | Không rơi vào onboarding/learning flow của employee | Operator có thể mở `/lo-trinh`, `/tien-bo`, `/kiem-tra` rồi gặp state sai ngữ cảnh | Lỗi | Proxy redirect về `/van-hanh?operator_notice=learning`, banner: `Tài khoản vận hành không có lộ trình học...` |
| GET `/api/platform-admin` không quyền | Trả 403, không đọc service-role data | Đã có gate từ task hardening trước | Đạt | Thêm regression/smoke: curl không cookie trả 403 |
| API list filters | Mọi list API có filter tương ứng | UI có filter client-side, GET API chưa nhận query params | Lỗi | GET `/api/platform-admin` nhận filter cho organizations/users/content/invite/audit và lọc report trước khi trả |
| Tổ chức | Có filter search/status/tool, empty-state, hành động nhạy cảm có confirm | Có filter/empty-state; rotate invite link còn thao tác ngay | Lỗi một phần | Thêm `aria-label`; bọc confirm cho `Xoay link`/`Tạo link mới` |
| Người dùng | Có filter search/role/account, empty-state, confirm reset/cấp quyền | Hoạt động; thiếu nhãn a11y trên control | Đạt một phần | Thêm `aria-label` cho filter, field và checkbox super-admin |
| Nội dung | Có filter search/collection/status, empty-state | Hoạt động; thiếu nhãn a11y trên control | Đạt một phần | Thêm `aria-label` cho filter/status select |
| AI & usage | Tổng hợp usage rõ, không có action ghi | Hiển thị được metrics OpenAI, chat, quiz, hours saved | Đạt | Không đổi |
| Nhật ký | Có filter search/action, empty-state | Hoạt động; thiếu nhãn a11y trên input | Đạt một phần | Thêm `aria-label` cho audit filters |
| Responsive | Mobile không tràn ngang, có menu mobile | Browser 390px không tràn ngang, menu mobile hiện | Đạt | Không đổi thêm |

## Browser evidence

- Login `admin@vinuni.vn / 12345678` vào được `/van-hanh`.
- `/van-hanh` top nav chỉ còn `Vận hành`, không còn manager/employee nav.
- Truy cập `/lo-trinh` bằng platform admin redirect về `/van-hanh?operator_notice=learning`, hiện banner tiếng Việt rồi tự dọn query.
- Filter no-result trên `Tổ chức`, `Người dùng`, `Nội dung`, `Nhật ký` đều hiện empty-state.
- Nút `Tạo link mới` mở confirm dialog; audit chỉ bấm hủy, không ghi dữ liệu.
- Viewport 390x844: console render, menu mobile hiện, `bodyScrollWidth === viewportWidth`.

## API evidence

- `curl http://localhost:3000/api/platform-admin` không cookie trả `403 FORBIDDEN`.
- Unit route test xác nhận GET không quyền không gọi loader, GET có quyền trả 200, POST không quyền trả 403.
- Unit route test mới xác nhận GET query params được parse và truyền xuống loader.

## Lưu ý còn lại

- `src/frontend/lib/platform-admin-console.ts` vẫn là file lib lớn vì đang gom cả report aggregation và write actions; UI components đã dưới 400 dòng. Nên tách lib thành `report`/`actions` ở task refactor riêng để giảm rủi ro.
