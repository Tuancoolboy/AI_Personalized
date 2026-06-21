# CONTRIBUTIONS — Nguyễn Xuân Tới

**Họ tên:** Nguyễn Xuân Tới · **Mã SV:** 2A202600810
**Định danh git:** `Lucas Nguyen <lucas.ai.vn@gmail.com>` — mọi commit của tôi đứng tên này
**Dự án:** AI Trợ Lý · Team 09 · AI20K Build Cohort 2
**Vai trò:** Người khởi xướng ý tưởng kinh doanh (product owner) kiêm builder.

> Tài liệu ghi nhận đóng góp **cá nhân của tôi**, đối chiếu bằng chứng kiểm chứng được (git, PR, log AI, tài liệu research). Danh sách tính năng dựa trên **commit đứng tên tôi**; phần làm việc nhóm được ghi rõ — không nhằm ghi nhận thay phần của các thành viên khác.

---

## 1. Business & Nghiên cứu khách hàng
- **Khởi xướng ý tưởng & định vị sản phẩm**, viết pitch theo công thức 3 ô, dựng Business Model Canvas + unit economics.
- **Khảo sát nhu cầu thị trường (10 phản hồi):** vị trí, ngành, quy mô, vấn đề nhức nhối nhất, mức sẵn sàng trả, người dùng chính.
- **Phỏng vấn sâu** chủ doanh nghiệp / quản lý / cá nhân → chiến lược tiếp cận 3 tệp khách hàng (end-user, HR, chủ DN) + cơ chế cam kết & đo lường hiệu quả.
- **Viết PRD** đầy đủ (mục tiêu, persona P1–P3, KPI, phạm vi Giai đoạn 1).

*Bằng chứng:* thư mục research (`Info-du-an/`): PRD, file khảo sát `.xlsx`, biên bản phỏng vấn, pitch 3 ô.

## 2. Sản phẩm & Giao diện (UI)
- **Thiết kế phần lớn giao diện** sản phẩm.
- **Redesign lesson UI** theo "hành trình 5 bước" + nhật ký phản tư.
- Flow **onboarding** chọn vai trò + assessment; flow **Aha Moment** (3 ô + AI hỏi 1 câu + chia sẻ).

## 3. Phát triển (Code) — 34 commit dưới tên `lucas.ai.vn@gmail.com` (hạng 2 toàn team)
Các tính năng tôi tham gia phát triển (đứng tên trong git; mục ghi *cùng team* là làm việc nhóm):
- **Agent sinh lộ trình cá nhân hóa 2 luồng** — gọi OpenAI thật + fallback rule-based (tính năng AI lõi). *(đồng phát triển cùng team)*
- **SaaS RBAC 3 tầng** + cô lập dữ liệu bằng RLS + audit log.
- **Khu Quản trị nền tảng** (super-admin, read-only) + gating demo.
- **Manager path builder** + **dept-tool** theo phòng ban và cá nhân.
- **Leaderboard 3 góc nhìn** + bảng tin.
- **Company invite** (gán phòng ban + vị trí khi mời) + đăng nhập Google.
- **Rubric grading** (chấm theo rubric), **AI tool selection**, file mẫu thực hành, mở rộng **lộ trình HR/Hành chính** + bảng kỹ năng.

*Bằng chứng:* `git log --all --author="lucas.ai.vn"` (34 commit); đứng tên merge **PR #22**.

## 4. Đánh giá & Đảm bảo chất lượng (Eval / QA)
- **Eval evidence:** 6 test case chạy **LLM thật** qua `/api/chat` (xác minh `X-Chat-Mode: demo-openai`), hội thoại 2 lượt, không mock; soạn báo cáo theo chuẩn BTC.
  *Bằng chứng:* `eval/results/EVAL-REPORT.md`, `eval/results/tro-ly-eval-2026-06-18.{json,md}`, `scripts/eval-tro-ly.mjs`.
- **Phát hiện vấn đề (trình bày trung thực):** clarify-first che câu trả lời; cắt output do giới hạn `max_tokens`; **thiếu vai trò HCNS** (rút ra từ persona người dùng thật trong khảo sát) → đề xuất bổ sung.
- **Sửa Architecture diagram** cho đúng stack thật (Next.js App Router + Supabase + OpenAI), thay bản boilerplate sai (FastAPI/LangGraph/ChromaDB).
  *Bằng chứng:* `adrs/0003-architecture-diagram.md`.

## 5. Ghi chú minh bạch
Giai đoạn đầu dự án, do lỗi quyền truy cập git trên máy, **một phần code của tôi được commit hộ qua thành viên khác (Hải)** — phần này có thể nằm trong các commit mang tên Hải. Sau khi khắc phục, mọi đóng góp được commit trực tiếp dưới tên `lucas.ai.vn@gmail.com`.

---

## Bằng chứng đối chiếu (tổng hợp)

| Loại | Nơi kiểm chứng |
|---|---|
| Commit code | `git log --all --author="lucas.ai.vn"` — 34 commit |
| Pull request | merge PR #22; PR `docs/lucas/eval-evidence`, `docs/lucas/architecture-diagram` |
| Log sử dụng AI | `.ai-log/session.jsonl` (`student: lucas.ai.vn@gmail.com`) |
| Nghiên cứu thị trường | `Info-du-an/` (PRD, khảo sát, phỏng vấn, pitch) |
| Eval & tài liệu | `eval/results/EVAL-REPORT.md`, `adrs/0003-architecture-diagram.md` |
