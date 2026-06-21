# Thư viện bài học HR — 56 bài (giải bài toán HR bằng Claude Pro)

> Nguồn code: `src/frontend/lib/roles-hr.ts` (vai trò `nhan-su`). 9 track, level 1 (nhập môn) · 2 (trung cấp) · 3 (nâng cao). Agent chọn 8–10 bài hợp với khảo sát; phần còn lại là kho để lọc.
>
> Học viên dùng **Claude bản Pro** — mỗi bài bám tính năng thật: **Projects** (nạp tài liệu công ty), **Artifacts** (tạo/chỉnh tài liệu), **upload file** (CV/lương/khảo sát), **web search** (luật/lương thị trường), **Claude in Excel**, **long-context**.

## Bám nhu cầu 25 học viên
Tuyển dụng (8) · Năng suất & Tự động hóa (8+6) · Quản lý-đánh giá-chính sách (5) · Phân tích dữ liệu (4) · C&B-Lương (3) · Đào tạo (3) · Hành chính (3). → đủ 8 track + track nền.

---

## Track 0 · Nền tảng Claude cho HR — `hr-nen-tang` (foundation, vào mọi lộ trình)
| id | Bài | Lvl |
|---|---|---|
| m1 | Claude là gì & vì sao HR nên dùng Claude | 1 |
| m2 | Claude Pro có gì: Projects, Artifacts, upload file, web search | 1 |
| m3 | Viết prompt cho HR: Vai trò + Bối cảnh + Yêu cầu + Định dạng | 1 |
| m4 | An toàn dữ liệu nhân sự: PII, lương, hợp đồng & luật | 1 |
| m5 | Dựng "Project Trợ lý HR": nạp chính sách, JD mẫu, giọng văn | 2 |
| m6 | Artifacts: tạo & chỉnh tài liệu HR ngay trong Claude | 2 |

## Track 1 · Tuyển dụng — `hr-tuyen-dung` *(nhu cầu #1)*
| id | Bài | Lvl |
|---|---|---|
| m7 | Viết JD chuẩn từ một mô tả ngắn | 1 |
| m8 | Tin tuyển dụng hấp dẫn cho từng kênh (TopCV, FB, LinkedIn) | 1 |
| m9 | Sàng lọc CV theo tiêu chí: upload CV + JD, Claude chấm điểm | 2 |
| m10 | Xây chân dung ứng viên từ JD + thị trường | 2 |
| m11 | Bộ câu hỏi phỏng vấn theo năng lực + scorecard | 2 |
| m12 | Tóm tắt & đánh giá ứng viên sau phỏng vấn | 2 |
| m13 | Email tuyển dụng toàn trình (mời PV, từ chối, offer) | 3 |
| m14 | Phân tích phễu tuyển dụng & nguồn ứng viên từ Excel | 3 |

## Track 2 · Onboarding & L&D — `hr-onboarding-ld`
| id | Bài | Lvl |
|---|---|---|
| m15 | Kế hoạch onboarding 30-60-90 ngày theo vị trí | 1 |
| m16 | Checklist nhận việc & email chào nhân viên mới | 1 |
| m17 | Biến tài liệu/SOP thành bài đào tạo + bài kiểm tra | 2 |
| m18 | Thiết kế khung đào tạo & lộ trình phát triển kỹ năng | 2 |
| m19 | Nội dung training "newbie": kịch bản, slide, tài liệu | 2 |
| m20 | Trợ lý onboarding & FAQ tự trả lời bằng Project | 3 |

## Track 3 · C&B & Lương — `hr-cb-luong`
| id | Bài | Lvl |
|---|---|---|
| m21 | Giải thích bảng lương, phụ cấp, thuế TNCN & BHXH dễ hiểu | 1 |
| m22 | Dùng Claude (Excel/file) kiểm tra & dò lỗi bảng công, bảng lương | 2 |
| m23 | Soạn & rà hợp đồng lao động, phụ lục, quyết định theo luật VN | 2 |
| m24 | Thiết kế cơ cấu lương 3P & khung phúc lợi | 2 |
| m25 | Khảo sát & benchmark lương thị trường (web search) | 2 |
| m26 | Viết công thức Excel tính & giải trình lương | 3 |

## Track 4 · Hiệu suất & KPI/OKR — `hr-hieu-suat`
| id | Bài | Lvl |
|---|---|---|
| m27 | Viết nhận xét đánh giá khách quan, xây dựng | 1 |
| m28 | Thiết kế KPI/OKR theo phòng ban & vị trí | 2 |
| m29 | Khung năng lực (competency framework) theo vị trí | 2 |
| m30 | Chuẩn bị & dẫn dắt 1:1, phản hồi, PIP | 2 |
| m31 | Tổng hợp & phân tích đánh giá 360 độ | 2 |
| m32 | Phân tích kết quả đánh giá toàn công ty → insight lãnh đạo | 3 |

## Track 5 · Quan hệ lao động & Chính sách — `hr-quan-he-chinh-sach`
| id | Bài | Lvl |
|---|---|---|
| m33 | Soạn chính sách & nội quy nội bộ rõ ràng | 1 |
| m34 | Xây sổ tay nhân viên (employee handbook) | 2 |
| m35 | Xử lý tình huống nhạy cảm: kỷ luật, khiếu nại | 2 |
| m36 | Khảo sát mức độ gắn kết & phân tích kết quả | 2 |
| m37 | Truyền thông nội bộ & quản trị văn hóa | 2 |
| m38 | Soạn thông điệp xử lý thay đổi tổ chức / khủng hoảng | 3 |

## Track 6 · HR Ops, Hành chính & Soạn thảo — `hr-hanh-chinh-ops`
| id | Bài | Lvl |
|---|---|---|
| m39 | Soạn email & văn bản hành chính HR trong 2 phút | 1 |
| m40 | Bộ mẫu thư/quyết định/thông báo dùng lại (template) | 1 |
| m41 | Chuẩn hóa quy trình HR (SOP) thành sơ đồ & checklist | 2 |
| m42 | Tóm tắt biên bản họp, chính sách dài & tài liệu pháp lý | 2 |
| m43 | Quản lý hồ sơ nhân sự: cấu trúc, đặt tên & checklist tuân thủ | 2 |
| m44 | Trợ lý trả lời câu hỏi HR lặp lại (policy Q&A) bằng Project | 3 |

## Track 7 · Phân tích dữ liệu HR — `hr-phan-tich-du-lieu`
| id | Bài | Lvl |
|---|---|---|
| m45 | Đọc & hiểu số liệu HR: turnover, headcount, tỉ lệ tuyển | 1 |
| m46 | Upload Excel nhân sự → Claude phân tích & tìm bất thường | 2 |
| m47 | Báo cáo nhân sự định kỳ tự động: mẫu + tóm tắt insight | 2 |
| m48 | Dashboard & biểu đồ HR bằng Artifacts | 2 |
| m49 | Headcount planning & dự báo nhu cầu nhân sự (Claude in Excel) | 3 |
| m50 | Phân tích nguyên nhân nghỉ việc & đề xuất giữ chân | 3 |

## Track 8 · Tự động hóa & Năng suất — `hr-tu-dong-hoa`
| id | Bài | Lvl |
|---|---|---|
| m51 | Xây thư viện prompt HR dùng lại hằng ngày | 1 |
| m52 | Dùng Project + Custom Instructions làm trợ lý HR riêng | 2 |
| m53 | "Một lần dựng, dùng mãi": biến việc lặp thành mẫu Claude | 2 |
| m54 | Kết nối Claude với Google Drive/email để xử lý tài liệu | 2 |
| m55 | Tư duy workflow tự động hóa HR — Claude làm "bộ não" | 3 |
| m56 | Đo thời gian tiết kiệm & nhân rộng cho cả phòng HR | 3 |

---

## Cấu trúc mỗi bài (tự sinh trong app từ `RoleModule`)
`Mục tiêu bài học` → `Nội dung chính` → `Các bước áp dụng ngay` → `Lưu ý an toàn & chất lượng`, kèm **prompt thực hành** copy-dùng-ngay. Mỗi bài gắn `skills: [<slug track>]` để Agent lọc.

## Starter kit (kèm vai trò HR)
6 prompt mẫu (JD, sàng lọc CV, onboarding 30-60-90, nhận xét đánh giá, phân tích file, email HR) + 4 công cụ gợi ý: **Claude** (chính), **Claude in Excel**, **NotebookLM**, **Gamma**. Kèm 5 câu quiz tình huống (an toàn dữ liệu, Project, ranh giới pháp lý, đưa bài toán Excel, mục tiêu tự động hóa).
