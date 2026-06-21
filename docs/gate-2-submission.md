# Gate 2 — Hồ sơ nộp · AI Trợ Lý (AI20K-083, Team 09)

**Người tổng hợp:** Nguyễn Xuân Tới · **MSV:** 2A202600810
**Tiêu chí cốt lõi:** agent nhận input → xử lý → trả output có nghĩa cho ≥1 user flow chính, chạy **end-to-end với LLM thật (không mock)**.
→ Flow chính: **Trợ lý AI (`/tro-ly`)** gọi OpenAI `gpt-4o-mini` trực tiếp; xác minh bằng header `X-Chat-Mode: demo-openai` (xem eval).

## Checklist deliverable

| # | Deliverable | Trạng thái | Vị trí / Link |
|---|---|---|---|
| 1 | **MVP Demo — video 3' end-to-end** | ✅ | https://drive.google.com/file/d/11bhfhUFavaPzpKZJ7XEi1JDThv_rpMfp/view (đặt quyền "Anyone with the link") |
| 2 | **Architecture diagram** (components + data flow) | ✅ | `adrs/0003-architecture-diagram.md` |
| 3 | **Repo ≥10 PR merged** | ✅ | [PR đã merge](https://github.com/AI20K-Build-Cohort-2/C2-App-009/pulls?q=is%3Apr+is%3Amerged) — 50+ PR |
| 4 | **README** (setup, env vars, sample queries) | ✅ | `README.md` (mục "Repo Setup" + "Câu Hỏi Mẫu Cho Trợ Lý AI") |
| 5 | **Eval evidence ≥5 test case output thật** | ✅ | `eval/results/EVAL-REPORT.md` · dữ liệu thô: `eval/results/tro-ly-eval-2026-06-18.{json,md}` · script: `scripts/eval-tro-ly.mjs` |

## Bằng chứng "LLM thật, không mock"
- 6/6 test case trong eval chạy với header **`X-Chat-Mode: demo-openai`** (gọi OpenAI thật), HTTP 200 — không phải `cache`/`demo`/fallback.
- Kịch bản & cách kiểm chứng trong video: `docs/video-demo-script-3min.md`.

## Cách chạy thử nhanh
```bash
# đặt OPENAI_API_KEY + OPENAI_MODEL=gpt-4o-mini vào src/frontend/.env.local
npx next dev src/frontend       # Node 20+
# mở http://localhost:3000 → /tro-ly → hỏi câu nghề nghiệp → xem trả lời stream (LLM thật)
```
