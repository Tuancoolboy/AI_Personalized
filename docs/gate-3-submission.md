# Gate 3 — Hồ sơ nộp · AI Trợ Lý

> Team 09 · AI20K Cohort 2 · Cập nhật: 25/06/2026

## Checklist deliverables

| Deliverable | Trạng thái | Bằng chứng |
|---|---|---|
| Deployed production URL | ✅ | https://c2-app-009.vercel.app |
| Evaluation framework + baseline | ✅ | `scripts/eval-tro-ly.mjs`, `scripts/summarize-gate3-eval.mjs`, `eval/results/GATE-3-EVAL-REPORT.md` |
| Guardrails | ✅ | `eval/results/GATE-3-GUARDRAILS-REPORT.md` + automated tests |
| Demo video draft 3–5 phút | ✅  | `planning/demo/gate-3-demo-video-plan.md`; Link Video : https://drive.google.com/file/d/167HINsJftLYevrXYG_ImX4gRFkpSSD24/view?usp=sharing |
| Pitch slides | ✅ | `presentation/gate-3-pitch-deck.pptx` |
| Cost report / user / month | ✅ | `docs/product/gate-3-cost-report.md` |

## 1. Production

**URL duy nhất để nộp và demo:** https://c2-app-009.vercel.app

- Vercel project: `c2-app-009`
- Framework: Next.js
- Source branch: `main`
- Production được remote-build lại ngày 25/06/2026 từ commit `3b20a7e`
  (`origin/main`) với Vercel production env; deployment:
  `c2-app-009-mxjakoekc-hai-dangs-projects-cf419357.vercel.app`.
- Alias cũ `ai-tro-ly.vercel.app` đã được gỡ để tránh hai URL production
  cạnh tranh.
- Domain dự kiến sau Gate 3: `https://c2-app-009.io.vn` — chưa chuyển DNS trong
  Gate 3.

Production smoke ngày 25/06/2026:

- Landing trả HTTP 200 và render đúng tiêu đề sản phẩm.
- `/login` render đúng.
- Google OAuth CTA xuất hiện; email/password giả bị Supabase từ chối với
  “Email hoặc mật khẩu sai” — xác nhận real auth mode.
- `/api/chat` với câu cache trả HTTP 200, header `X-Chat-Mode: cache`.
- `/api/platform-admin` khi chưa đăng nhập trả HTTP 403.

## 2. Evaluation baseline

Baseline hiện tại chạy ngày 18/06/2026 trên `gpt-4o-mini`, qua API thật của sản
phẩm, không mock.

| Metric | Baseline |
|---|---:|
| Test cases | 6 |
| LLM turns | 11 |
| HTTP success | 11/11 |
| LLM thật (`demo-openai`) | 11/11 |
| Strict quality pass rate | 66,7% |
| Pass hoặc partial | 83,3% |
| Average full-response latency | 7,58 giây |
| P50 latency | 8,42 giây |
| P95 latency | 13,73 giây |
| Min–max latency | 1,60–13,73 giây |

Chi tiết và hạn chế: `eval/results/GATE-3-EVAL-REPORT.md`.

Chạy lại:

```bash
# Không gọi LLM, chỉ tổng hợp baseline đã lưu
npm run eval:gate3:summary

# Có gọi OpenAI thật và phát sinh API cost
EVAL_BASE_URL=http://localhost:3000 npm run eval:tro-ly
```

## 3. Guardrails

Các lớp bảo vệ đã có:

- authentication và authorization cho app/API;
- Supabase RLS cho dữ liệu user-scoped;
- rate limit chat, lead và platform-admin;
- giới hạn message 4.000 ký tự;
- phát hiện dữ liệu nhạy cảm và cảnh báo trước output;
- redact dữ liệu nhạy cảm trước khi tạo memory;
- loại bỏ prompt-injection patterns và context headers giả;
- scope boundary: chỉ hỗ trợ AI trong công việc/học tập;
- admin endpoint từ chối request không có quyền.

Automated evidence ngày 25/06/2026: 23/23 test guardrail pass.

Repo verification:

- ESLint: 0 errors, 5 pre-existing warnings.
- Vitest: 70 files / 337 tests pass.
- Phase 1 API integration: 30/30 pass.
- Phase 2 manager/invite: 12/12 pass.
- Auth/OAuth: 7/7 pass.
- Python backend: 88/88 pass.
- Next.js production build: pass.

## 4. Demo video

Video cần quay lại trên production để phản ánh bản mới nhất. Bộ quay đã chuẩn bị:

- pitch deck: `presentation/gate-3-pitch-deck.pptx`;
- timeline, lời thoại, prompt chính và backup:
  `planning/demo/gate-3-demo-video-plan.md`;
- video Gate 3 tham chiếu:
  https://drive.google.com/file/d/167HINsJftLYevrXYG_ImX4gRFkpSSD24/view?usp=sharing

Phần duy nhất cần con người hoàn tất là đăng nhập bằng tài khoản Supabase thật,
quay màn hình + voice-over và upload link video mới.

## 5. Cost / user / month

Baseline dùng giá `gpt-4o-mini`: input `$0.15/1M tokens`, output
`$0.60/1M tokens`.

| Usage | Estimated monthly LLM cost | +25% contingency |
|---|---:|---:|
| Low | ~404đ/user | ~505đ/user |
| Base | ~1.191đ/user | ~1.488đ/user |
| High — 30 chat calls/day | ~16.374đ/user | ~20.468đ/user |

Ngay cả kịch bản high vẫn dưới guardrail kinh doanh 22.000đ/user/tháng theo
giả định token hiện tại. Xem đầy đủ assumptions và công thức tại
`docs/product/gate-3-cost-report.md`.

## Trước khi bấm Submit

- [ ] Merge nhánh Gate 3 vào `develop`, sau đó `main`.
- [ ] Xác nhận CD production thành công trên commit merge cuối.
- [ ] Smoke lại URL production sau deploy cuối.
- [ ] Quay và upload video 3–5 phút, đặt quyền xem bằng link.
- [ ] Điền link video mới vào file này.
- [ ] Nếu chạy live eval mới, thay baseline 18/06 bằng kết quả mới.
