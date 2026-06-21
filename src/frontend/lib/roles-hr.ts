// ============================================================================
// THƯ VIỆN BÀI HỌC HR (Giai đoạn 2) — vai trò "nhan-su"
// ----------------------------------------------------------------------------
// Nguồn: phân tích 25 hồ sơ đăng ký chương trình "AI dành cho HR" + nghiên cứu
// nghiệp vụ HR chuẩn (AIHR) + use case Claude cho HR (claude.com/resources).
//
// QUAN TRỌNG — học viên dùng CLAUDE bản Pro. Mọi bài học hướng dẫn giải quyết
// bài toán HR BẰNG CLAUDE (Projects, Artifacts, upload file, web search,
// Claude in Excel, long-context), không phải lý thuyết AI trừu tượng.
//
// CƠ CHẾ "AGENT LỌC BÀI": mỗi bài gắn `skills: [<slug nhóm việc>]`. Bài khảo sát
// (assessment-hr.ts) cho học viên chọn đúng các slug đó ở câu "muốn AI hóa việc
// gì". Agent join skill ↔ nhu cầu để lọc ra lộ trình sát người học. 56 bài —
// Agent chỉ chọn 8–10 bài phù hợp nhất; phần còn lại là "long tail" để lọc.
//
// CÁCH DÙNG: import HR_ROLE và gắn vào ROLES trong lib/roles.ts:
//   import { HR_ROLE } from "./roles-hr";
//   export const ROLES = { ...,  "nhan-su": HR_ROLE };
// (Xem docs/hr-phase2/README-TICH-HOP.md cho đủ các điểm cần chỉnh.)
// ============================================================================

import type { AttachedFile, Role, RoleModule } from "./roles";

const HR_FILES = "/files/hr";

/** File mẫu đính kèm bài thực hành — map theo id module (public/files/hr/). */
export const HR_ATTACHED_FILES: Record<string, AttachedFile> = {
  "nhan-su-m4": {
    name: "ho-so-nhan-vien-lam-gia.txt",
    path: `${HR_FILES}/ho-so-nhan-vien-lam-gia.txt`,
    desc: "Hồ sơ nhân viên đã làm giả (có PII). Thử ẩn danh trước khi upload lên Claude.",
  },
  "nhan-su-m9": {
    name: "jd-va-cv-mau.md",
    path: `${HR_FILES}/jd-va-cv-mau.md`,
    desc: "JD + 3 CV ẩn danh. Upload cùng prompt để Claude chấm điểm & xếp hạng.",
  },
  "nhan-su-m12": {
    name: "ghi-chu-phong-van-mau.txt",
    path: `${HR_FILES}/ghi-chu-phong-van-mau.txt`,
    desc: "Ghi chú phỏng vấn rời rạc. Nhờ Claude tổng hợp thành biên bản đánh giá.",
  },
  "nhan-su-m14": {
    name: "du-lieu-tuyen-dung-mau.csv",
    path: `${HR_FILES}/du-lieu-tuyen-dung-mau.csv`,
    desc: "Dữ liệu phễu tuyển theo kênh. Tính tỉ lệ chuyển đổi & time-to-hire.",
  },
  "nhan-su-m17": {
    name: "sop-quy-trinh-mau.md",
    path: `${HR_FILES}/sop-quy-trinh-mau.md`,
    desc: "SOP/quy trình HR khô khan. Biến thành bài đào tạo + câu hỏi kiểm tra.",
  },
  "nhan-su-m21": {
    name: "bang-luong-mau.xlsx",
    path: `${HR_FILES}/bang-luong-mau.xlsx`,
    desc: "Phiếu lương mẫu (đã làm giả). Giải thích từng khoản cho nhân viên.",
  },
  "nhan-su-m22": {
    name: "bang-cong-luong-mau.csv",
    path: `${HR_FILES}/bang-cong-luong-mau.csv`,
    desc: "Bảng chấm công + lương ẩn danh. Dò lỗi logic & công thức với Claude.",
  },
  "nhan-su-m31": {
    name: "ket-qua-360-mau.md",
    path: `${HR_FILES}/ket-qua-360-mau.md`,
    desc: "Kết quả 360 độ (ẩn danh người đánh giá). Tổng hợp điểm mạnh & khoảng trống.",
  },
  "nhan-su-m32": {
    name: "danh-gia-mau.xlsx",
    path: `${HR_FILES}/danh-gia-mau.xlsx`,
    desc: "Bảng điểm đánh giá toàn công ty (ẩn danh). Phân tích phân bố & insight cho lãnh đạo.",
  },
  "nhan-su-m36": {
    name: "ket-qua-khao-sat-gan-ket-mau.csv",
    path: `${HR_FILES}/ket-qua-khao-sat-gan-ket-mau.csv`,
    desc: "Kết quả khảo sát gắn kết (Likert). Kèm file cau-mo-mau.txt cho câu trả lời mở.",
  },
  "nhan-su-m41": {
    name: "sop-quy-trinh-mau.md",
    path: `${HR_FILES}/sop-quy-trinh-mau.md`,
    desc: "Mô tả quy trình HR lộn xộn. Chuẩn hóa thành SOP + RACI + checklist.",
  },
  "nhan-su-m42": {
    name: "bien-ban-hop-mau.txt",
    path: `${HR_FILES}/bien-ban-hop-mau.txt`,
    desc: "Biên bản họp thô. Tóm tắt quyết định, đầu việc & người phụ trách.",
  },
  "nhan-su-m46": {
    name: "nhan-su-mau.xlsx",
    path: `${HR_FILES}/nhan-su-mau.xlsx`,
    desc: "Bảng nhân sự quý (ẩn danh). Phân tích turnover & bất thường.",
  },
  "nhan-su-m48": {
    name: "headcount-mau.xlsx",
    path: `${HR_FILES}/headcount-mau.xlsx`,
    desc: "Dữ liệu headcount & turnover. Tạo dashboard HR bằng Artifact.",
  },
  "nhan-su-m49": {
    name: "headcount-cost-mau.csv",
    path: `${HR_FILES}/headcount-cost-mau.csv`,
    desc: "Headcount + chi phí lương theo phòng. Dự báo kế hoạch nhân sự 12 tháng.",
  },
  "nhan-su-m50": {
    name: "du-lieu-nghi-viec-exit-mau.md",
    path: `${HR_FILES}/du-lieu-nghi-viec-exit-mau.md`,
    desc: "Dữ liệu nghỉ việc + exit interview ẩn danh. Tìm mẫu hình & đề xuất giữ chân.",
  },
};

function withHrAttachedFiles(modules: RoleModule[]): RoleModule[] {
  return modules.map((mod) => {
    const attachedFile = HR_ATTACHED_FILES[mod.id];
    return attachedFile ? { ...mod, attachedFile } : mod;
  });
}

// --- Bộ slug nhóm nghiệp vụ HR (VOCAB CHUNG: khảo sát ↔ bài học ↔ agent) -----
export const HR_TASK_CATEGORIES: { slug: string; label: string; desc: string }[] = [
  {
    slug: "hr-tuyen-dung",
    label: "Tuyển dụng & sàng lọc ứng viên",
    desc: "Viết JD, tin tuyển dụng, sàng lọc CV, chân dung ứng viên, câu hỏi & thang điểm phỏng vấn, email tuyển dụng, phân tích phễu.",
  },
  {
    slug: "hr-onboarding-ld",
    label: "Onboarding & Đào tạo (L&D)",
    desc: "Kế hoạch 30-60-90, checklist nhận việc, biến tài liệu thành bài đào tạo, khung phát triển, nội dung training newbie.",
  },
  {
    slug: "hr-cb-luong",
    label: "C&B, tính lương & phúc lợi",
    desc: "Giải thích/đối soát bảng lương, hợp đồng lao động, cơ cấu lương 3P, phúc lợi, benchmark lương, công thức Excel lương.",
  },
  {
    slug: "hr-hieu-suat",
    label: "Đánh giá hiệu suất & KPI/OKR",
    desc: "Viết nhận xét đánh giá, thiết kế KPI/OKR, khung năng lực, 1:1 & phản hồi, PIP, tổng hợp 360 độ.",
  },
  {
    slug: "hr-quan-he-chinh-sach",
    label: "Quan hệ lao động & chính sách",
    desc: "Soạn chính sách/nội quy, sổ tay nhân viên, xử lý kỷ luật/khiếu nại, khảo sát gắn kết, truyền thông nội bộ.",
  },
  {
    slug: "hr-hanh-chinh-ops",
    label: "HR Ops, hành chính & soạn thảo",
    desc: "Email/văn bản hành chính, mẫu thư & quyết định, chuẩn hóa quy trình (SOP), tóm tắt tài liệu, quản lý hồ sơ.",
  },
  {
    slug: "hr-phan-tich-du-lieu",
    label: "Phân tích dữ liệu HR & báo cáo",
    desc: "Đọc số liệu nhân sự, phân tích file Excel, báo cáo định kỳ, dashboard, headcount planning, phân tích nghỉ việc.",
  },
  {
    slug: "hr-tu-dong-hoa",
    label: "Tự động hóa & năng suất",
    desc: "Thư viện prompt, Project trợ lý HR riêng, biến việc lặp thành mẫu, kết nối Drive/email, tư duy workflow tự động.",
  },
];

// --- Nhãn slug để merge vào SKILL_LABELS trong roles.ts (tùy chọn) -----------
export const HR_SKILL_LABELS: Record<string, string> = {
  "hr-nen-tang": "Nền tảng Claude cho HR",
  "hr-tuyen-dung": "Tuyển dụng & sàng lọc ứng viên",
  "hr-onboarding-ld": "Onboarding & Đào tạo (L&D)",
  "hr-cb-luong": "C&B, tính lương & phúc lợi",
  "hr-hieu-suat": "Đánh giá hiệu suất & KPI/OKR",
  "hr-quan-he-chinh-sach": "Quan hệ lao động & chính sách",
  "hr-hanh-chinh-ops": "HR Ops, hành chính & soạn thảo",
  "hr-phan-tich-du-lieu": "Phân tích dữ liệu HR & báo cáo",
  "hr-tu-dong-hoa": "Tự động hóa & năng suất HR",
};

// ============================================================================
// 56 BÀI HỌC — leveled 1 (nhập môn) · 2 (trung cấp) · 3 (nâng cao)
// ============================================================================

const HR_MODULES: RoleModule[] = [
  // ----------------------------------------------------------------- //
  // TRACK 0 — NỀN TẢNG CLAUDE CHO HR (foundation, vào mọi lộ trình)    //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m1",
    title: "Claude là gì & vì sao HR nên dùng Claude",
    durationMin: 12,
    level: 1,
    isFoundation: true,
    skills: ["hr-nen-tang"],
    content:
      "Claude là trợ lý AI viết & đọc tài liệu rất mạnh — hợp với HR vì 80% việc HR là chữ nghĩa: JD, email, chính sách, đánh giá, báo cáo. So với ChatGPT, Claude giỏi đọc tài liệu dài (hợp đồng, sổ tay, file CV), giữ giọng văn nhất quán và bám đúng yêu cầu. Hãy coi Claude như một trợ lý HR ngồi cạnh: bạn ra đề, nó làm nháp, bạn duyệt và chịu trách nhiệm cuối cùng.",
    learnings: [
      "Hiểu Claude bằng ngôn ngữ HR đời thường",
      "Khi nào dùng Claude, khi nào dùng công cụ khác",
      "Điều Claude KHÔNG thay được người làm HR",
    ],
    practicePrompt:
      "Bạn là trợ lý AI cho nhân sự (HR) tại doanh nghiệp Việt Nam. Bối cảnh: tôi làm [VỊ TRÍ HR] ở công ty [NGÀNH, QUY MÔ] người. Yêu cầu: liệt kê 10 việc HR tôi làm hằng tuần mà AI có thể giúp làm nhanh hơn, kèm mức tiết kiệm thời gian ước tính. Định dạng: bảng 3 cột (Việc | AI giúp gì | Mức tiết kiệm), xếp từ tiết kiệm nhiều đến ít. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m2",
    title: "Claude Pro có gì: Projects, Artifacts, upload file, web search",
    durationMin: 18,
    level: 1,
    isFoundation: true,
    skills: ["hr-nen-tang"],
    content:
      "Bản Pro mở 5 'siêu năng lực' cho HR: (1) Projects — không gian lưu sẵn tài liệu công ty để Claude luôn hiểu bối cảnh; (2) Artifacts — tạo & sửa tài liệu (JD, email, checklist) ngay trong khung chat, copy ra dùng liền; (3) Upload file — kéo CV, bảng lương, file khảo sát vào để Claude đọc; (4) Web search — tra cứu luật, mức lương thị trường; (5) Long-context — đọc tài liệu cả trăm trang. Bài này cho bạn bản đồ tổng thể trước khi đi sâu.",
    learnings: [
      "5 năng lực Pro quan trọng nhất cho HR",
      "Khác biệt giữa chat thường và Project",
      "Artifacts: tạo tài liệu dùng được ngay",
    ],
    practicePrompt:
      "Bạn là trợ lý AI cho HR, giải thích cho người không rành công nghệ. Bối cảnh: tôi mới dùng Claude Pro. Yêu cầu: giải thích khác nhau giữa hỏi trong chat thường và tạo một Project, và khi nào dùng cái nào trong công việc HR. Định dạng: ngôn ngữ đời thường, kèm 1 ví dụ cụ thể trong tuyển dụng, tối đa 200 từ. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m3",
    title: "Viết prompt cho HR: Vai trò + Bối cảnh + Yêu cầu + Định dạng",
    durationMin: 20,
    level: 1,
    isFoundation: true,
    skills: ["hr-nen-tang"],
    content:
      "Công thức 4 phần cho mọi prompt HR: (1) Vai trò — 'Bạn là chuyên viên tuyển dụng…'; (2) Bối cảnh — ngành, quy mô, văn hóa công ty; (3) Yêu cầu cụ thể — làm gì, cho ai; (4) Định dạng đầu ra — bảng, email ≤150 từ, checklist. Prompt mơ hồ cho kết quả chung chung; prompt 4 phần cho kết quả dùng được ngay. Mẹo: nhờ Claude tự hỏi lại bạn 2–3 câu trước khi làm.",
    learnings: [
      "Công thức prompt 4 phần",
      "Yêu cầu định dạng đầu ra để khỏi sửa nhiều",
      "Mẹo 'hỏi lại tôi nếu thiếu thông tin'",
    ],
    practicePrompt:
      "Bạn là chuyên gia viết prompt cho người làm HR. Bối cảnh: tôi muốn nhờ Claude soạn email mời phỏng vấn. Yêu cầu: HÃY HỎI LẠI tôi 3 câu cần thiết trước, sau đó viết một prompt mẫu hoàn chỉnh theo cấu trúc Vai trò + Bối cảnh + Yêu cầu + Định dạng. Định dạng: in prompt mẫu trong khối riêng để tôi copy dùng lại.",
  },
  {
    id: "nhan-su-m4",
    title: "An toàn dữ liệu nhân sự: PII, lương, hợp đồng & luật khi dùng AI",
    durationMin: 18,
    level: 1,
    isFoundation: true,
    skills: ["hr-nen-tang", "hr-quan-he-chinh-sach"],
    content:
      "HR giữ dữ liệu nhạy cảm nhất công ty: CMND/CCCD, số tài khoản, lương, hồ sơ kỷ luật, sức khỏe. Nguyên tắc: ẩn danh trước khi đưa lên AI (thay tên bằng 'Ứng viên A', bỏ số CCCD/tài khoản), mô tả tình huống chung thay vì dán nguyên hồ sơ. Bật tùy chọn không dùng dữ liệu để huấn luyện. Mọi nội dung pháp lý (hợp đồng, quyết định kỷ luật) phải được người có thẩm quyền rà lại — Claude làm nháp, không thay luật sư.",
    learnings: [
      "Dữ liệu HR nào tuyệt đối không dán nguyên văn",
      "Cách ẩn danh nhanh trước khi nhờ AI",
      "Ranh giới: AI làm nháp, người chịu trách nhiệm",
    ],
    practicePrompt:
      "Bạn là chuyên gia an toàn dữ liệu nhân sự. Bối cảnh: đây là đoạn hồ sơ nhân viên ĐÃ LÀM GIẢ (có tên, CCCD, số tài khoản, lương). Yêu cầu: chỉ ra các trường nhạy cảm không nên đưa lên AI công cộng, viết lại bản ẩn danh an toàn, và gợi ý quy tắc ẩn danh dùng lại. Định dạng: (1) danh sách trường nhạy cảm, (2) bản ẩn danh, (3) 5 quy tắc. Dữ liệu: [DÁN/UPLOAD ĐOẠN ĐÃ LÀM GIẢ]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m5",
    title: "Dựng 'Project Trợ lý HR': nạp chính sách, JD mẫu, giọng văn công ty",
    durationMin: 22,
    level: 2,
    isFoundation: true,
    skills: ["hr-nen-tang", "hr-tu-dong-hoa"],
    content:
      "Đây là bước tạo khác biệt lớn nhất. Tạo một Project tên 'Trợ lý HR [Công ty]', nạp vào phần Knowledge: sổ tay nhân viên, khung lương, JD mẫu, quy trình, ví dụ email chuẩn giọng công ty. Viết Custom Instructions: 'Luôn dùng giọng [trang trọng/thân thiện], xưng hô [anh/chị], theo đúng chính sách trong tài liệu.' Từ đó MỌI câu trả lời đều bám bối cảnh công ty bạn — không phải gõ lại context mỗi lần.",
    learnings: [
      "Tài liệu nền nên nạp vào Project",
      "Viết Custom Instructions cho trợ lý HR",
      "Lợi ích: không lặp lại bối cảnh, kết quả nhất quán",
    ],
    practicePrompt:
      "Bạn là chuyên gia triển khai Claude cho phòng HR. Bối cảnh: tôi sắp tạo một Project Trợ lý HR cho công ty [NGÀNH, QUY MÔ] người. Yêu cầu: gợi ý 8 tài liệu nên nạp vào Knowledge và viết phần Custom Instructions chuẩn (vai trò, giọng xưng hô, ràng buộc an toàn dữ liệu). Định dạng: (1) danh sách tài liệu có giải thích ngắn, (2) đoạn Custom Instructions sẵn dán. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m6",
    title: "Artifacts: tạo & chỉnh tài liệu HR ngay trong Claude",
    durationMin: 18,
    level: 2,
    isFoundation: true,
    skills: ["hr-nen-tang", "hr-hanh-chinh-ops"],
    content:
      "Khi bạn nhờ Claude tạo JD, email, checklist hay bảng, kết quả hiện ra ở khung Artifact bên phải — bạn chỉnh trực tiếp, yêu cầu 'rút ngắn', 'trang trọng hơn', 'thêm cột deadline' và Claude sửa tại chỗ. Artifact giữ phiên bản, copy ra Word/Google Docs trong một cú nhấp. Đây là cách HR ra tài liệu hoàn chỉnh thay vì copy từng đoạn chat.",
    learnings: [
      "Nhận biết & dùng khung Artifact",
      "Lệnh chỉnh sửa lặp nhanh (rút gọn, đổi giọng…)",
      "Xuất tài liệu ra Word/Docs",
    ],
    practicePrompt:
      "Bạn là trợ lý HR. Bối cảnh: công ty [NGÀNH, QUY MÔ]. Yêu cầu: tạo một checklist onboarding nhân viên mới ngày đầu, đầy đủ đầu mục (tài khoản, thiết bị, giấy tờ, đào tạo, người đỡ đầu). Định dạng: Artifact dạng bảng 4 cột (Việc cần làm | Người phụ trách | Hạn | Trạng thái), nhóm theo giai đoạn. Sau đó chờ tôi yêu cầu chỉnh thêm. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },

  // ----------------------------------------------------------------- //
  // TRACK 1 — TUYỂN DỤNG (8 bài) — nhu cầu #1 (8/25 học viên)          //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m7",
    title: "Viết JD chuẩn từ một mô tả ngắn",
    durationMin: 18,
    level: 1,
    skills: ["hr-tuyen-dung"],
    content:
      "Đưa Claude vài gạch đầu dòng (chức danh, 3–4 nhiệm vụ chính, yêu cầu) → nhận JD đầy đủ: mô tả công việc, yêu cầu, quyền lợi, đúng giọng công ty. Nhờ Claude kiểm tra ngôn ngữ thiên kiến (giới tính, tuổi), chèn EVP hấp dẫn và căn chỉnh với khung lương. Một JD tốt trong 5 phút thay vì nửa buổi.",
    learnings: [
      "Biến gạch đầu dòng thành JD hoàn chỉnh",
      "Loại bỏ ngôn ngữ thiên kiến trong JD",
      "Chuẩn hóa JD theo giọng công ty",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng (TA). Bối cảnh: công ty [NGÀNH, QUY MÔ]. Yêu cầu: viết JD cho vị trí [CHỨC DANH] với nhiệm vụ chính [3-4 gạch đầu dòng]; tránh ngôn ngữ phân biệt tuổi/giới. Định dạng: Artifact gồm Mô tả công việc, Yêu cầu, Quyền lợi; giọng thân thiện, chuyên nghiệp. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m8",
    title: "Tin tuyển dụng hấp dẫn cho từng kênh (TopCV, Facebook, LinkedIn)",
    durationMin: 18,
    level: 1,
    skills: ["hr-tuyen-dung"],
    content:
      "Từ một JD, nhờ Claude tạo nhiều phiên bản tin đăng: bản ngắn bắt mắt cho Facebook, bản chuyên nghiệp cho LinkedIn, bản đầy đủ cho TopCV/VietnamWorks. Mỗi kênh một giọng và độ dài khác nhau, kèm hashtag, hook 3 dòng đầu để tăng tỉ lệ ứng tuyển.",
    learnings: [
      "Một JD → nhiều tin theo từng kênh",
      "Hook thu hút trong 3 dòng đầu",
      "Tối ưu độ dài & giọng theo nền tảng",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng kiêm content tuyển dụng. Bối cảnh: dùng JD bên dưới. Yêu cầu: viết 3 phiên bản tin tuyển dụng theo kênh, có hook 3 dòng đầu và hashtag phù hợp. Định dạng: (1) Facebook ≤120 từ, (2) LinkedIn chuyên nghiệp, (3) TopCV đầy đủ — xuất Artifact. Dữ liệu: [DÁN JD]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m9",
    title: "Sàng lọc CV theo tiêu chí: upload CV + JD, Claude chấm điểm",
    durationMin: 25,
    level: 2,
    skills: ["hr-tuyen-dung"],
    content:
      "Upload JD + nhiều CV (đã ẩn thông tin nhạy cảm), nhờ Claude chấm mỗi CV theo tiêu chí bạn đặt (kinh nghiệm, kỹ năng, độ phù hợp), tóm tắt điểm mạnh/điểm yếu/cờ đỏ và xếp hạng. Bạn tiết kiệm hàng giờ đọc CV, nhưng luôn tự đọc lại top ứng viên — AI hỗ trợ ra quyết định, không thay quyết định.",
    learnings: [
      "Đặt tiêu chí chấm rõ ràng cho Claude",
      "Đọc bảng tóm tắt điểm mạnh/yếu/cờ đỏ",
      "Tránh thiên kiến & tự kiểm tra top CV",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng giàu kinh nghiệm. Bối cảnh: đây là JD và các CV đã ẩn danh. Yêu cầu: chấm mỗi CV theo thang Kinh nghiệm /40, Kỹ năng /40, Phù hợp văn hóa /20; nêu điểm mạnh, rủi ro, cờ đỏ; KHÔNG tự loại, để tôi quyết định. Định dạng: bảng xếp hạng + 2 dòng nhận xét/ứng viên. Dữ liệu: [DÁN/UPLOAD JD + CV]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m10",
    title: "Xây chân dung ứng viên (candidate persona) từ JD + thị trường",
    durationMin: 20,
    level: 2,
    skills: ["hr-tuyen-dung"],
    content:
      "Nhờ Claude dựng chân dung ứng viên lý tưởng: họ đang ở đâu (kênh tìm việc), điều gì khiến họ chuyển việc, từ khóa họ tìm, lo ngại khi ứng tuyển. Kết hợp web search để cập nhật mức lương & xu hướng. Chân dung này dùng để viết tin, chọn kênh sourcing và chuẩn bị câu hỏi phỏng vấn đúng động lực.",
    learnings: [
      "Dựng chân dung ứng viên đa chiều",
      "Tìm đúng kênh & thông điệp tiếp cận",
      "Dùng web search cập nhật lương/xu hướng",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng am hiểu thị trường lao động VN. Bối cảnh: vị trí [CHỨC DANH] tại [THÀNH PHỐ]. Yêu cầu: dựng chân dung ứng viên lý tưởng (nhân khẩu, động lực chuyển việc, kênh tìm việc, lo ngại, thông điệp thu hút); dùng web search ước lượng khoảng lương hiện tại và nêu nguồn. Định dạng: theo từng mục, gạch đầu dòng. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m11",
    title: "Bộ câu hỏi phỏng vấn theo năng lực + thang điểm (scorecard)",
    durationMin: 22,
    level: 2,
    skills: ["hr-tuyen-dung", "hr-hieu-suat"],
    content:
      "Từ JD, nhờ Claude tạo bộ câu hỏi phỏng vấn theo từng năng lực (behavioral/STAR), kèm 'câu hỏi đào sâu' và scorecard chấm điểm chuẩn để các interviewer chấm thống nhất. Có thể custom theo từng ứng viên dựa trên CV. Đây là nhu cầu trực tiếp của nhiều học viên (custom câu hỏi & bảng điểm cho từng vị trí).",
    learnings: [
      "Câu hỏi phỏng vấn theo năng lực (STAR)",
      "Scorecard chuẩn cho nhiều interviewer",
      "Cá nhân hóa câu hỏi theo CV ứng viên",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng kiêm thiết kế phỏng vấn. Bối cảnh: vị trí [CHỨC DANH], dựa JD nếu có. Yêu cầu: tạo bộ câu hỏi phỏng vấn theo 5 năng lực cốt lõi (mỗi năng lực 2 câu STAR + 1 câu đào sâu) và scorecard 1-5 có mô tả từng mức. Định dạng: Artifact dạng bảng, dùng chung cho nhiều interviewer. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m12",
    title: "Tóm tắt & đánh giá ứng viên sau phỏng vấn từ ghi chú/transcript",
    durationMin: 20,
    level: 2,
    skills: ["hr-tuyen-dung"],
    content:
      "Dán ghi chú phỏng vấn rời rạc hoặc transcript, Claude tổng hợp thành biên bản đánh giá gọn: điểm mạnh, rủi ro, mức độ phù hợp từng tiêu chí, đề xuất pass/fail kèm lý do. Giúp ra quyết định nhanh và lưu hồ sơ tuyển dụng minh bạch.",
    learnings: [
      "Biến ghi chú rời thành biên bản đánh giá",
      "Chấm theo tiêu chí, nêu lý do rõ ràng",
      "Lưu vết quyết định tuyển dụng",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng. Bối cảnh: đây là ghi chú phỏng vấn rời rạc. Yêu cầu: tổng hợp thành biên bản đánh giá ứng viên gồm tóm tắt, điểm mạnh, rủi ro, chấm theo 4 tiêu chí [LIỆT KÊ], đề xuất pass/fail kèm lý do. Định dạng: biên bản gọn có tiêu đề rõ. Dữ liệu: [DÁN/UPLOAD GHI CHÚ]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m13",
    title: "Email tuyển dụng toàn trình: mời PV, từ chối khéo, gửi offer",
    durationMin: 18,
    level: 3,
    skills: ["hr-tuyen-dung", "hr-hanh-chinh-ops"],
    content:
      "Một lần dựng, dùng cả mùa tuyển: bộ email mời phỏng vấn, nhắc lịch, từ chối lịch sự giữ thiện cảm thương hiệu, gửi offer, nhắc nhận việc. Nạp vào Project để tái dùng, chỉ điền tên & vị trí. Giữ trải nghiệm ứng viên đồng nhất và chuyên nghiệp.",
    learnings: [
      "Bộ email tuyển dụng đầy đủ vòng đời",
      "Từ chối khéo, giữ thương hiệu tuyển dụng",
      "Tái dùng qua Project",
    ],
    practicePrompt:
      "Bạn là chuyên viên tuyển dụng phụ trách trải nghiệm ứng viên. Bối cảnh: công ty [NGÀNH], giọng [thân thiện/trang trọng]. Yêu cầu: tạo bộ 5 email (mời PV, nhắc lịch, từ chối sau PV giữ thiện cảm, gửi offer, nhắc nhận việc), có [chỗ điền] biến. Định dạng: Artifact, mỗi email có tiêu đề + thân, để lưu vào Project tái dùng. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m14",
    title: "Phân tích phễu tuyển dụng & nguồn ứng viên từ Excel",
    durationMin: 22,
    level: 3,
    skills: ["hr-tuyen-dung", "hr-phan-tich-du-lieu"],
    content:
      "Upload file theo dõi tuyển dụng (số CV, qua vòng, kênh, thời gian tuyển), nhờ Claude tính tỉ lệ chuyển đổi từng vòng, kênh nào hiệu quả nhất, thời gian tuyển trung bình, và đề xuất nên dồn ngân sách vào đâu. Claude in Excel có thể viết công thức và biểu đồ ngay trên file.",
    learnings: [
      "Tính tỉ lệ chuyển đổi phễu tuyển",
      "So sánh hiệu quả kênh sourcing",
      "Ra quyết định phân bổ dựa trên dữ liệu",
    ],
    practicePrompt:
      "Bạn là chuyên viên phân tích tuyển dụng. Bối cảnh: đây là dữ liệu phễu tuyển dụng theo kênh. Yêu cầu: tính tỉ lệ chuyển đổi từng vòng, time-to-hire trung bình, hiệu quả/chi phí theo kênh; đề xuất 3 hành động phân bổ nguồn lực. Định dạng: bảng số liệu + 3 khuyến nghị. Dữ liệu: [DÁN/UPLOAD FILE]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },

  // ----------------------------------------------------------------- //
  // TRACK 2 — ONBOARDING & ĐÀO TẠO / L&D (6 bài)                       //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m15",
    title: "Kế hoạch onboarding 30-60-90 ngày theo vị trí",
    durationMin: 20,
    level: 1,
    skills: ["hr-onboarding-ld"],
    content:
      "Nhân viên quyết định ở hay đi thường trong 90 ngày đầu. Nhờ Claude dựng kế hoạch 30-60-90 ngày theo vị trí: mục tiêu từng mốc, người hỗ trợ, tài liệu cần đọc, cột mốc đánh giá. Có thể dựng riêng cho từng vị trí trong vài phút.",
    learnings: [
      "Khung 30-60-90 ngày cho người mới",
      "Mục tiêu & cột mốc đánh giá rõ ràng",
      "Cá nhân hóa theo từng vị trí",
    ],
    practicePrompt:
      "Bạn là chuyên viên L&D / phụ trách onboarding. Bối cảnh: vị trí [CHỨC DANH] tại [NGÀNH]. Yêu cầu: lập kế hoạch onboarding 30-60-90 ngày; mỗi mốc gồm mục tiêu, việc cần làm, người hỗ trợ, tiêu chí đánh giá. Định dạng: Artifact dạng bảng theo 3 mốc. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m16",
    title: "Checklist nhận việc & email chào nhân viên mới",
    durationMin: 15,
    level: 1,
    skills: ["hr-onboarding-ld", "hr-hanh-chinh-ops"],
    content:
      "Tạo checklist nhận việc đầy đủ (tài khoản, thiết bị, giấy tờ, đào tạo bắt buộc, người đỡ đầu) và bộ email: chào mừng trước ngày đầu, thông báo nội bộ giới thiệu thành viên mới, lịch tuần đầu. Mọi thứ dùng lại cho mọi đợt tuyển.",
    learnings: [
      "Checklist nhận việc không sót đầu mục",
      "Email chào mừng tạo ấn tượng đầu",
      "Thông báo nội bộ giới thiệu người mới",
    ],
    practicePrompt:
      "Bạn là chuyên viên nhân sự phụ trách onboarding. Bối cảnh: công ty [NGÀNH, QUY MÔ]. Yêu cầu: tạo checklist nhận việc ngày đầu + email chào mừng nhân viên mới + thông báo nội bộ giới thiệu. Định dạng: Artifact, mỗi phần tách rõ; giọng thân thiện, chuyên nghiệp. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m17",
    title: "Biến tài liệu/SOP thành bài đào tạo + bài kiểm tra ngắn",
    durationMin: 22,
    level: 2,
    skills: ["hr-onboarding-ld"],
    content:
      "Upload quy trình hoặc tài liệu khô khan, nhờ Claude biến thành bài học dễ hiểu: chia phần, thêm ví dụ, tóm tắt 'cần nhớ', kèm 5 câu trắc nghiệm kiểm tra hiểu bài + đáp án. Đây là cách nhân bản đào tạo mà không tốn người.",
    learnings: [
      "Chuyển tài liệu thành bài học có cấu trúc",
      "Thêm ví dụ & phần 'cần nhớ'",
      "Sinh câu hỏi kiểm tra tự động",
    ],
    practicePrompt:
      "Bạn là chuyên viên L&D thiết kế nội dung đào tạo. Bối cảnh: đây là tài liệu/SOP khô khan. Yêu cầu: biến thành một bài đào tạo dễ hiểu (chia mục, ví dụ, phần Cần nhớ) kèm 5 câu trắc nghiệm có đáp án và giải thích. Định dạng: bài học có cấu trúc + phần quiz cuối. Dữ liệu: [DÁN/UPLOAD TÀI LIỆU]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m18",
    title: "Thiết kế khung đào tạo & lộ trình phát triển kỹ năng",
    durationMin: 22,
    level: 2,
    skills: ["hr-onboarding-ld", "hr-hieu-suat"],
    content:
      "Nhờ Claude dựng khung đào tạo theo cấp độ (mới → vững → chuyên gia) cho một vị trí: kỹ năng cần học, nguồn học, thời lượng, cách đánh giá. Gắn với khung năng lực để biết ai cần học gì. Phù hợp cả công ty nhỏ chưa có hệ thống L&D.",
    learnings: [
      "Lộ trình phát triển theo cấp độ",
      "Gắn đào tạo với khung năng lực",
      "Khung L&D gọn cho công ty nhỏ",
    ],
    practicePrompt:
      "Bạn là chuyên viên L&D. Bối cảnh: vị trí [CHỨC DANH], công ty nhỏ chưa có hệ thống đào tạo. Yêu cầu: thiết kế lộ trình phát triển kỹ năng qua 3 cấp độ (mới → vững → chuyên gia); mỗi cấp gồm kỹ năng, nội dung học, thời lượng, tiêu chí lên cấp. Định dạng: Artifact dạng bảng. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m19",
    title: "Nội dung training 'newbie': kịch bản, slide outline, tài liệu",
    durationMin: 20,
    level: 2,
    skills: ["hr-onboarding-ld"],
    content:
      "Trainer nội bộ dùng Claude để soạn nhanh: outline buổi đào tạo, kịch bản dẫn, dàn ý slide, handout, hoạt động tương tác. Nói rõ đối tượng & thời lượng → nhận giáo án hoàn chỉnh, chỉ cần tinh chỉnh theo phong cách.",
    learnings: [
      "Soạn outline & kịch bản buổi đào tạo",
      "Dàn ý slide + handout đồng bộ",
      "Thêm hoạt động tương tác giữ năng lượng",
    ],
    practicePrompt:
      "Bạn là trainer nội bộ. Bối cảnh: buổi đào tạo [CHỦ ĐỀ] cho [ĐỐI TƯỢNG], dài [X] phút. Yêu cầu: soạn giáo án gồm mục tiêu, outline theo phút, kịch bản dẫn, dàn ý slide, 1 hoạt động nhóm, handout tóm tắt. Định dạng: theo từng mục, dễ thực hiện. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m20",
    title: "Trợ lý onboarding & FAQ tự trả lời bằng Project",
    durationMin: 20,
    level: 3,
    skills: ["hr-onboarding-ld", "hr-tu-dong-hoa"],
    content:
      "Nạp sổ tay, chính sách, quy trình vào một Project → người mới (hoặc bạn) hỏi 'nghỉ phép tính sao', 'quy trình xin thiết bị' và Claude trả lời đúng theo tài liệu công ty. Giảm tải câu hỏi lặp cho HR. Bạn tổng hợp được bộ FAQ chuẩn từ chính các câu hỏi thường gặp.",
    learnings: [
      "Project trả lời câu hỏi theo tài liệu công ty",
      "Giảm câu hỏi lặp đổ về HR",
      "Tự sinh bộ FAQ chuẩn",
    ],
    practicePrompt:
      "Bạn là trợ lý onboarding, CHỈ trả lời dựa trên tài liệu công ty đã nạp vào Project. Bối cảnh: người mới hỏi về quy định/quy trình. Yêu cầu: trả lời đúng theo tài liệu, trích phần liên quan; nếu tài liệu không có thì nói rõ và gợi ý hỏi ai. Định dạng: câu trả lời ngắn gọn, có trích nguồn. Câu hỏi: [DÁN CÂU HỎI NGƯỜI MỚI].",
  },

  // ----------------------------------------------------------------- //
  // TRACK 3 — C&B, TÍNH LƯƠNG & PHÚC LỢI (6 bài)                       //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m21",
    title: "Giải thích bảng lương, phụ cấp, thuế TNCN & BHXH dễ hiểu",
    durationMin: 18,
    level: 1,
    skills: ["hr-cb-luong"],
    content:
      "Nhờ Claude giải thích từng khoản trên phiếu lương bằng ngôn ngữ đời thường, hoặc soạn email giải thích cho nhân viên thắc mắc 'sao tháng này nhận ít hơn'. Cũng dùng để tự ôn cách tính thuế TNCN, BHXH theo bậc. Lưu ý luôn đối chiếu mức/luật mới nhất (web search) vì quy định thay đổi.",
    learnings: [
      "Giải thích các khoản lương dễ hiểu",
      "Soạn email trả lời thắc mắc lương",
      "Đối chiếu quy định mới nhất",
    ],
    practicePrompt:
      "Bạn là chuyên viên C&B. Bối cảnh: nhân viên thắc mắc vì sao lương thực nhận tháng này thấp hơn; các khoản như sau (đã làm giả). Yêu cầu: viết email giải thích rõ ràng, đồng cảm, đúng từng khoản; bật web search nếu cần đối chiếu quy định mới. Định dạng: email ≤180 từ, có tiêu đề. Dữ liệu: [DÁN CÁC KHOẢN ĐÃ LÀM GIẢ]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m22",
    title: "Dùng Claude (Excel/file) kiểm tra & dò lỗi bảng công, bảng lương",
    durationMin: 25,
    level: 2,
    skills: ["hr-cb-luong", "hr-phan-tich-du-lieu"],
    content:
      "Nhiều học viên nói bảng lương / Excel phức tạp dùng AI chưa hiệu quả — mấu chốt là cách đưa bài toán. Upload file (đã ẩn tên), mô tả quy tắc tính, nhờ Claude dò ô sai logic, công lệch, công thức hỏng, và đề xuất công thức chuẩn. Claude in Excel làm việc trực tiếp trên file. Luôn đối chiếu lại bản gốc.",
    learnings: [
      "Đưa bài toán Excel đúng cách cho AI",
      "Dò lỗi logic & công thức bảng lương",
      "Nhận công thức chuẩn để áp dụng",
    ],
    practicePrompt:
      "Bạn là chuyên viên C&B kiêm rà soát số liệu. Bối cảnh: đây là bảng chấm công + quy tắc tính lương (đã ẩn danh). Yêu cầu: dò các dòng bất thường (công âm, vượt định mức, tăng ca không tính tiền, mã trùng, thực nhận lệch công thức); liệt kê lỗi nghi ngờ và đề xuất công thức đúng. Định dạng: bảng (Dòng | Lỗi nghi ngờ | Đề xuất). Dữ liệu: [UPLOAD FILE]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m23",
    title: "Soạn & rà hợp đồng lao động, phụ lục, quyết định theo luật VN",
    durationMin: 22,
    level: 2,
    skills: ["hr-cb-luong", "hr-quan-he-chinh-sach"],
    content:
      "Claude soạn nháp hợp đồng lao động, phụ lục, quyết định bổ nhiệm/điều chuyển theo cấu trúc chuẩn, và rà soát hợp đồng để chỉ ra điều khoản thiếu/rủi ro. CẢNH BÁO: đây là nháp tham khảo — phải đối chiếu Bộ luật Lao động hiện hành và để bộ phận pháp lý duyệt trước khi ký.",
    learnings: [
      "Soạn nháp văn bản lao động đúng cấu trúc",
      "Rà điều khoản thiếu/rủi ro",
      "Ranh giới pháp lý: luôn để người có thẩm quyền duyệt",
    ],
    practicePrompt:
      "Bạn là chuyên viên nhân sự soạn thảo văn bản lao động (nháp tham khảo, không thay luật sư). Bối cảnh: hợp đồng lao động xác định thời hạn 12 tháng cho vị trí [CHỨC DANH], theo cấu trúc chuẩn VN. Yêu cầu: soạn nháp, đánh dấu [chỗ cần điền] và ghi chú điều khoản cần pháp lý rà lại. Định dạng: văn bản có mục rõ + phần Ghi chú pháp lý cuối. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m24",
    title: "Thiết kế cơ cấu lương 3P & khung phúc lợi",
    durationMin: 22,
    level: 2,
    skills: ["hr-cb-luong"],
    content:
      "Nhờ Claude phác khung lương 3P (Position–Person–Performance), dải lương theo cấp bậc, và gói phúc lợi phù hợp ngân sách & ngành. Dùng như bản nháp để thảo luận với ban lãnh đạo, không phải con số cuối — cần dữ liệu thị trường thật để chốt.",
    learnings: [
      "Hiểu & phác khung lương 3P",
      "Thiết kế dải lương theo cấp bậc",
      "Gói phúc lợi theo ngân sách",
    ],
    practicePrompt:
      "Bạn là chuyên gia C&B. Bối cảnh: công ty [NGÀNH, QUY MÔ] người. Yêu cầu: phác khung lương 3P (nguyên tắc, yếu tố P1/P2/P3, ví dụ dải lương 4 cấp bậc) và 5 phúc lợi nên có; nêu rõ giả định cần kiểm chứng bằng dữ liệu thị trường. Định dạng: theo mục, có bảng dải lương. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m25",
    title: "Khảo sát & benchmark lương thị trường bằng web search",
    durationMin: 20,
    level: 2,
    skills: ["hr-cb-luong", "hr-phan-tich-du-lieu"],
    content:
      "Dùng Claude web search để tổng hợp khoảng lương thị trường cho một vị trí theo thành phố/ngành từ các nguồn công khai, rồi so với khung công ty để biết đang trả cao/thấp. Kết quả là ước lượng tham khảo — ghi rõ nguồn & ngày để báo cáo lên cấp trên.",
    learnings: [
      "Tổng hợp khoảng lương thị trường",
      "So sánh khung công ty vs thị trường",
      "Trích nguồn & nêu giới hạn dữ liệu",
    ],
    practicePrompt:
      "Bạn là chuyên viên C&B nghiên cứu thị trường lương. Bối cảnh: vị trí [CHỨC DANH] tại [THÀNH PHỐ]; công ty đang trả [X]. Yêu cầu: dùng web search tổng hợp khoảng lương hiện tại (min–trung vị–max) từ nguồn công khai, nêu nguồn và ngày, so sánh với mức công ty và nhận xét. Định dạng: bảng + đoạn nhận xét; ghi rõ giới hạn dữ liệu. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m26",
    title: "Viết công thức Excel tính & giải trình lương cùng Claude",
    durationMin: 22,
    level: 3,
    skills: ["hr-cb-luong", "hr-tu-dong-hoa"],
    content:
      "Mô tả cách tính (lương theo công, tăng ca, phụ cấp, khấu trừ) → Claude viết công thức Excel/Google Sheets sẵn dán, giải thích từng phần, và tạo bảng tính mẫu. Bạn tự động hóa khâu tính toán mà không cần biết hàm phức tạp.",
    learnings: [
      "Mô tả logic lương để Claude ra công thức",
      "Hiểu công thức để tự bảo trì",
      "Tạo bảng tính lương mẫu tái dùng",
    ],
    practicePrompt:
      "Bạn là chuyên gia Excel cho C&B. Bối cảnh: tôi cần công thức tính lương gồm lương cơ bản theo ngày công thực tế + tăng ca 150% + phụ cấp [X] − BHXH [tỉ lệ] − tạm ứng. Yêu cầu: viết công thức Excel cho từng cột và giải thích ngắn từng phần. Định dạng: bảng (Cột | Công thức | Giải thích). Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },

  // ----------------------------------------------------------------- //
  // TRACK 4 — ĐÁNH GIÁ HIỆU SUẤT & KPI/OKR (6 bài)                     //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m27",
    title: "Viết nhận xét đánh giá hiệu suất khách quan, xây dựng",
    durationMin: 18,
    level: 1,
    skills: ["hr-hieu-suat"],
    content:
      "Đưa Claude vài gạch đầu dòng về kết quả & hành vi của nhân viên → nhận bản nhận xét cân bằng (ghi nhận + góp ý phát triển), ngôn ngữ chuyên nghiệp, tránh cảm tính. Giúp quản lý viết review nhanh và công bằng hơn.",
    learnings: [
      "Biến gạch đầu dòng thành nhận xét hoàn chỉnh",
      "Cân bằng ghi nhận & góp ý",
      "Ngôn ngữ khách quan, hướng phát triển",
    ],
    practicePrompt:
      "Bạn là quản lý trực tiếp / HR tại doanh nghiệp VN. Bối cảnh: nhân viên [VỊ TRÍ] với thành tích [..], điểm cần cải thiện [..], hành vi [..]. Yêu cầu: viết nhận xét đánh giá cuối kỳ cân bằng ghi nhận và góp ý, kèm 2-3 gợi ý phát triển cụ thể. Định dạng: 3 đoạn (Ghi nhận / Cần cải thiện / Định hướng), ≤250 từ, giọng chuyên nghiệp, xây dựng. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m28",
    title: "Thiết kế KPI/OKR theo phòng ban & vị trí",
    durationMin: 22,
    level: 2,
    skills: ["hr-hieu-suat"],
    content:
      "Nhờ Claude đề xuất KPI/OKR đo được, gắn mục tiêu công ty, tránh chỉ tiêu 'làm cho có'. Cho từng vị trí: 3–5 chỉ tiêu, cách đo, trọng số, mục tiêu. Dùng làm bản nháp để quản lý phòng tinh chỉnh.",
    learnings: [
      "Phân biệt KPI tốt vs hình thức",
      "Đặt chỉ tiêu đo được, có trọng số",
      "Gắn mục tiêu cá nhân với công ty",
    ],
    practicePrompt:
      "Bạn là HRBP thiết kế hệ thống đo lường. Bối cảnh: vị trí [CHỨC DANH], gắn mục tiêu công ty. Yêu cầu: đề xuất 3-5 KPI/OKR đo được; mỗi chỉ tiêu có cách đo, trọng số, mục tiêu quý; cảnh báo chỉ tiêu dễ bị lách. Định dạng: bảng + ghi chú cảnh báo. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m29",
    title: "Khung năng lực (competency framework) theo vị trí",
    durationMin: 20,
    level: 2,
    skills: ["hr-hieu-suat", "hr-onboarding-ld"],
    content:
      "Claude dựng khung năng lực: năng lực cốt lõi + chuyên môn cho vị trí, mô tả hành vi theo 4–5 mức thành thạo. Dùng cho tuyển dụng, đánh giá, và lộ trình đào tạo — một nền tảng nhiều mục đích.",
    learnings: [
      "Xác định năng lực cốt lõi & chuyên môn",
      "Mô tả hành vi theo mức thành thạo",
      "Tái dùng cho tuyển dụng & đào tạo",
    ],
    practicePrompt:
      "Bạn là chuyên gia khung năng lực. Bối cảnh: vị trí [CHỨC DANH]. Yêu cầu: dựng khung năng lực gồm 4 năng lực cốt lõi + 3 chuyên môn, mỗi năng lực mô tả hành vi ở 4 mức (cơ bản → xuất sắc), dùng được cho cả tuyển dụng và đào tạo. Định dạng: Artifact dạng bảng. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m30",
    title: "Chuẩn bị & dẫn dắt 1:1, phản hồi và kế hoạch cải thiện (PIP)",
    durationMin: 20,
    level: 2,
    skills: ["hr-hieu-suat", "hr-quan-he-chinh-sach"],
    content:
      "Claude giúp soạn agenda 1:1, gợi câu hỏi mở, cách đưa phản hồi khó theo mô hình SBI, và dựng kế hoạch cải thiện hiệu suất (PIP) công bằng, rõ mục tiêu & thời hạn. Hỗ trợ quản lý xử lý tình huống nhạy cảm đúng mực.",
    learnings: [
      "Agenda & câu hỏi cho buổi 1:1",
      "Đưa phản hồi khó theo mô hình SBI",
      "Dựng PIP công bằng, đo được",
    ],
    practicePrompt:
      "Bạn là HRBP hỗ trợ quản lý xử lý hiệu suất. Bối cảnh: nhân viên [mô tả vấn đề hiệu suất]. Yêu cầu: soạn (1) agenda buổi 1:1, (2) cách mở lời phản hồi theo mô hình SBI, (3) khung PIP 30 ngày với mục tiêu đo được. Định dạng: 3 phần tách rõ, giọng tôn trọng, hướng hỗ trợ. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m31",
    title: "Tổng hợp & phân tích đánh giá 360 độ",
    durationMin: 22,
    level: 2,
    skills: ["hr-hieu-suat", "hr-phan-tich-du-lieu"],
    content:
      "Upload kết quả 360 (đã ẩn danh người đánh giá), Claude tổng hợp chủ đề lặp lại, mâu thuẫn giữa các nguồn, điểm mạnh/khoảng trống, và gợi ý phát triển — biến hàng chục phản hồi rời thành báo cáo dùng được trong buổi feedback.",
    learnings: [
      "Tổng hợp phản hồi 360 thành chủ đề",
      "Phát hiện mâu thuẫn giữa các nguồn",
      "Gợi ý phát triển cá nhân",
    ],
    practicePrompt:
      "Bạn là chuyên gia phát triển nhân sự. Bối cảnh: đây là kết quả 360 độ (ẩn danh người đánh giá) của một nhân viên. Yêu cầu: tổng hợp 3 điểm mạnh nổi bật, 3 khoảng trống, mâu thuẫn giữa các nhóm đánh giá, 3 gợi ý phát triển. Định dạng: theo từng mục, ngắn gọn. Dữ liệu: [DÁN/UPLOAD KẾT QUẢ 360]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m32",
    title: "Phân tích kết quả đánh giá toàn công ty → insight cho lãnh đạo",
    durationMin: 22,
    level: 3,
    skills: ["hr-hieu-suat", "hr-phan-tich-du-lieu"],
    content:
      "Upload bảng kết quả đánh giá toàn công ty, nhờ Claude tìm phân bố điểm, phòng ban mạnh/yếu, tương quan với thâm niên, và viết bản tóm tắt 1 trang cho ban lãnh đạo kèm khuyến nghị. Dữ liệu phải ẩn danh ở mức cá nhân.",
    learnings: [
      "Đọc phân bố & xu hướng đánh giá",
      "Tìm tương quan đáng chú ý",
      "Viết tóm tắt điều hành 1 trang",
    ],
    practicePrompt:
      "Bạn là chuyên viên People Analytics. Bối cảnh: đây là bảng điểm đánh giá toàn công ty (ẩn danh). Yêu cầu: phân tích phân bố điểm, so sánh phòng ban, tương quan với thâm niên; viết tóm tắt cho ban lãnh đạo kèm 3 khuyến nghị. Định dạng: tóm tắt điều hành 1 trang + bảng số liệu chính. Dữ liệu: [DÁN/UPLOAD BẢNG ĐIỂM]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },

  // ----------------------------------------------------------------- //
  // TRACK 5 — QUAN HỆ LAO ĐỘNG & CHÍNH SÁCH (6 bài)                    //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m33",
    title: "Soạn chính sách & nội quy nội bộ rõ ràng",
    durationMin: 18,
    level: 1,
    skills: ["hr-quan-he-chinh-sach"],
    content:
      "Mô tả ý định (vd chính sách làm việc từ xa, nghỉ phép, thưởng) → Claude soạn chính sách có cấu trúc: mục đích, phạm vi, quy định, ngoại lệ, hiệu lực. Ngôn ngữ rõ, ít gây hiểu nhầm. Rà lại theo luật & văn hóa công ty trước khi ban hành.",
    learnings: [
      "Cấu trúc một chính sách rõ ràng",
      "Ngôn ngữ tránh hiểu nhầm",
      "Liệt kê ngoại lệ & hiệu lực",
    ],
    practicePrompt:
      "Bạn là chuyên viên phụ trách chính sách nhân sự. Bối cảnh: công ty [NGÀNH, QUY MÔ], chính sách [TÊN, vd làm việc từ xa]. Yêu cầu: soạn chính sách rõ ràng gồm mục đích, phạm vi áp dụng, quy định chi tiết, ngoại lệ, ngày hiệu lực; ngôn ngữ tránh hiểu nhầm. Định dạng: Artifact có mục đánh số. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m34",
    title: "Xây sổ tay nhân viên (employee handbook)",
    durationMin: 25,
    level: 2,
    skills: ["hr-quan-he-chinh-sach", "hr-onboarding-ld"],
    content:
      "Nhờ Claude dựng khung sổ tay nhân viên đầy đủ chương mục (văn hóa, giờ làm, lương–phúc lợi, quy tắc ứng xử, an toàn, quy trình), rồi viết từng chương theo bối cảnh công ty. Dùng Project để giữ nhất quán giọng văn xuyên suốt.",
    learnings: [
      "Khung chương mục sổ tay chuẩn",
      "Viết từng chương theo bối cảnh",
      "Giữ nhất quán bằng Project",
    ],
    practicePrompt:
      "Bạn là chuyên viên nhân sự soạn sổ tay, dùng tài liệu công ty trong Project để giữ giọng nhất quán. Bối cảnh: công ty [NGÀNH, QUY MÔ]. Yêu cầu: đề xuất mục lục sổ tay nhân viên đầy đủ, rồi viết chi tiết chương [TÊN CHƯƠNG]. Định dạng: mục lục + nội dung chương; giọng thân thiện nhưng chuyên nghiệp. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m35",
    title: "Xử lý tình huống nhạy cảm: kỷ luật, khiếu nại",
    durationMin: 20,
    level: 2,
    skills: ["hr-quan-he-chinh-sach"],
    content:
      "Claude giúp soạn biên bản, thư nhắc nhở, quyết định kỷ luật đúng trình tự, và kịch bản cho buổi trao đổi khó. Trung lập, dựa sự việc, giảm rủi ro pháp lý & cảm xúc. CẢNH BÁO: tình huống kỷ luật/chấm dứt HĐLĐ phải tuân thủ đúng quy trình luật và có pháp lý duyệt.",
    learnings: [
      "Soạn văn bản kỷ luật đúng trình tự",
      "Kịch bản cho buổi trao đổi khó",
      "Giữ trung lập, giảm rủi ro pháp lý",
    ],
    practicePrompt:
      "Bạn là chuyên viên quan hệ lao động (văn bản là nháp, cần pháp lý duyệt). Bối cảnh: một nhân viên [mô tả vi phạm, đã ẩn danh]. Yêu cầu: soạn biên bản ghi nhận sự việc + thư nhắc nhở lần 1 đúng trình tự, ngôn ngữ trung lập dựa sự việc; ghi chú điểm cần pháp lý rà. Định dạng: 2 văn bản tách rõ + phần Ghi chú pháp lý. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m36",
    title: "Khảo sát mức độ gắn kết & phân tích kết quả",
    durationMin: 22,
    level: 2,
    skills: ["hr-quan-he-chinh-sach", "hr-phan-tich-du-lieu"],
    content:
      "Claude soạn bộ câu hỏi khảo sát gắn kết/eNPS phù hợp công ty, rồi sau khi thu phản hồi (upload), tổng hợp điểm, chủ đề tích cực/tiêu cực từ câu trả lời mở, và đề xuất hành động. Biến khảo sát thành quyết định thực tế.",
    learnings: [
      "Thiết kế khảo sát gắn kết/eNPS",
      "Phân tích câu trả lời mở thành chủ đề",
      "Đề xuất hành động từ kết quả",
    ],
    practicePrompt:
      "Bạn là chuyên viên gắn kết nhân sự. Bối cảnh: công ty [NGÀNH]. Yêu cầu: soạn khảo sát gắn kết 12 câu (thang Likert + 2 câu mở); sau khi tôi upload kết quả, tổng hợp điểm và chủ đề tích cực/tiêu cực. Định dạng: bộ câu hỏi theo nhóm; phần phân tích để sau. Dữ liệu (bước 2): [UPLOAD KẾT QUẢ]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m37",
    title: "Truyền thông nội bộ & quản trị văn hóa",
    durationMin: 18,
    level: 2,
    skills: ["hr-quan-he-chinh-sach", "hr-hanh-chinh-ops"],
    content:
      "Claude viết thông báo nội bộ, bản tin, nội dung vinh danh, lời chúc sự kiện, thông điệp dịp lễ — đúng giọng văn hóa công ty. Lập lịch nội dung truyền thông nội bộ hằng tháng để giữ kết nối đội ngũ.",
    learnings: [
      "Viết thông báo & bản tin nội bộ",
      "Nội dung vinh danh, gắn kết",
      "Lịch truyền thông nội bộ hằng tháng",
    ],
    practicePrompt:
      "Bạn là chuyên viên truyền thông nội bộ. Bối cảnh: [SỰ KIỆN/CHÍNH SÁCH], giọng [văn hóa công ty]. Yêu cầu: viết thông báo nội bộ cho toàn công ty, có tiêu đề thu hút và lời kêu gọi hành động rõ. Định dạng: Artifact, ≤200 từ. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m38",
    title: "Soạn thông điệp xử lý thay đổi tổ chức / khủng hoảng nhân sự",
    durationMin: 20,
    level: 3,
    skills: ["hr-quan-he-chinh-sach"],
    content:
      "Khi có tái cấu trúc, cắt giảm, sáp nhập hay sự cố, Claude giúp dựng kế hoạch truyền thông: thông điệp cho từng nhóm (ở lại, rời đi, quản lý), FAQ lường trước câu hỏi khó, kịch bản họp. Đồng cảm, minh bạch, giảm tổn thương niềm tin.",
    learnings: [
      "Thông điệp riêng cho từng nhóm",
      "FAQ lường trước câu hỏi khó",
      "Giữ minh bạch & đồng cảm",
    ],
    practicePrompt:
      "Bạn là cố vấn truyền thông nhân sự trong thay đổi tổ chức. Bối cảnh: công ty sắp [thay đổi tổ chức]. Yêu cầu: dựng kế hoạch truyền thông nội bộ gồm thông điệp chính, phiên bản cho 3 nhóm (ở lại / bị ảnh hưởng / quản lý), FAQ 8 câu khó, kịch bản họp thông báo. Định dạng: theo từng phần; giọng minh bạch, đồng cảm. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },

  // ----------------------------------------------------------------- //
  // TRACK 6 — HR OPS, HÀNH CHÍNH & SOẠN THẢO (6 bài)                   //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m39",
    title: "Soạn email & văn bản hành chính HR trong 2 phút",
    durationMin: 15,
    level: 1,
    skills: ["hr-hanh-chinh-ops"],
    content:
      "Email thông báo, nhắc việc, mời họp, trả lời nhân viên — nói ý chính, Claude viết bản hoàn chỉnh đúng giọng & độ dài. Học cách ra lệnh ngắn (giọng, độ dài, đối tượng) để khỏi sửa nhiều.",
    learnings: [
      "Ra lệnh ngắn cho email chuẩn",
      "Điều chỉnh giọng & độ dài",
      "Mẫu mở đầu/kết thư chuyên nghiệp",
    ],
    practicePrompt:
      "Bạn là chuyên viên hành chính nhân sự. Bối cảnh: email [mục đích] gửi [đối tượng], giọng [trang trọng/thân thiện], ý chính [gạch đầu dòng]. Yêu cầu: viết email hoàn chỉnh, có tiêu đề và lời kêu gọi rõ. Định dạng: ≤150 từ, sẵn gửi. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m40",
    title: "Bộ mẫu thư/quyết định/thông báo dùng lại (template hệ thống)",
    durationMin: 18,
    level: 1,
    skills: ["hr-hanh-chinh-ops", "hr-tu-dong-hoa"],
    content:
      "Tạo một lần bộ template hay dùng (quyết định bổ nhiệm, thông báo nghỉ lễ, xác nhận công tác, thư cảm ơn) với [chỗ điền], lưu trong Project. Lần sau chỉ điền biến — chuẩn hóa văn bản toàn phòng HR.",
    learnings: [
      "Dựng template có chỗ điền",
      "Lưu & tái dùng qua Project",
      "Chuẩn hóa văn bản toàn phòng",
    ],
    practicePrompt:
      "Bạn là chuyên viên hành chính nhân sự chuẩn hóa văn bản. Bối cảnh: công ty [NGÀNH, QUY MÔ]. Yêu cầu: tạo bộ 5 template văn bản HR hay dùng (bạn đề xuất loại) với [chỗ điền] rõ ràng và hướng dẫn dùng cho mỗi mẫu. Định dạng: Artifact để lưu vào Project. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m41",
    title: "Chuẩn hóa quy trình HR (SOP) thành sơ đồ & checklist",
    durationMin: 22,
    level: 2,
    skills: ["hr-hanh-chinh-ops", "hr-onboarding-ld"],
    content:
      "Mô tả quy trình đang làm (tuyển dụng, onboarding, nghỉ phép…), Claude chuẩn hóa thành SOP: các bước, người phụ trách (RACI), biểu mẫu, sơ đồ luồng, checklist. 'Thiết lập quy trình HR' là nhu cầu trực tiếp của học viên.",
    learnings: [
      "Biến quy trình thực tế thành SOP",
      "Phân vai RACI rõ ràng",
      "Sơ đồ luồng + checklist kèm theo",
    ],
    practicePrompt:
      "Bạn là chuyên gia chuẩn hóa quy trình HR. Bối cảnh: đây là mô tả quy trình [TÊN] đang làm (lộn xộn). Yêu cầu: chuẩn hóa thành SOP gồm mục đích, các bước, phân vai RACI, biểu mẫu cần, checklist và mô tả sơ đồ luồng. Định dạng: Artifact có mục rõ. Dữ liệu: [DÁN/UPLOAD MÔ TẢ QUY TRÌNH]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m42",
    title: "Tóm tắt biên bản họp, chính sách dài & tài liệu pháp lý",
    durationMin: 18,
    level: 2,
    skills: ["hr-hanh-chinh-ops", "hr-phan-tich-du-lieu"],
    content:
      "Tận dụng long-context: upload tài liệu dài (biên bản họp, thông tư, hợp đồng) → Claude tóm tắt ý chính, đầu việc kèm người phụ trách & hạn, điểm cần lưu ý. Đọc 30 trang trong 1 phút thay vì cả buổi.",
    learnings: [
      "Tóm tắt tài liệu dài giữ ý quan trọng",
      "Trích đầu việc + người + hạn",
      "Đánh dấu điểm rủi ro cần lưu ý",
    ],
    practicePrompt:
      "Bạn là trợ lý hành chính nhân sự. Bối cảnh: đây là biên bản họp thô. Yêu cầu: tóm tắt thành 5 quyết định chính, bảng đầu việc (Việc | Người | Hạn), và 3 điểm cần theo dõi. Định dạng: phần tóm tắt + bảng đầu việc. Dữ liệu: [DÁN/UPLOAD BIÊN BẢN]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m43",
    title: "Quản lý hồ sơ nhân sự: cấu trúc, đặt tên & checklist tuân thủ",
    durationMin: 18,
    level: 2,
    skills: ["hr-hanh-chinh-ops"],
    content:
      "Claude đề xuất cây thư mục hồ sơ nhân sự, quy ước đặt tên file, checklist giấy tờ bắt buộc theo vòng đời nhân viên (tuyển → ký HĐ → onboarding → nghỉ việc), và bảng theo dõi hồ sơ thiếu. 'Quản lý hồ sơ nhân sự' là nhu cầu được nêu trực tiếp.",
    learnings: [
      "Cấu trúc & đặt tên hồ sơ khoa học",
      "Checklist giấy tờ theo vòng đời",
      "Bảng theo dõi hồ sơ còn thiếu",
    ],
    practicePrompt:
      "Bạn là chuyên viên hành chính nhân sự phụ trách hồ sơ. Bối cảnh: công ty [QUY MÔ] người. Yêu cầu: đề xuất hệ thống quản lý hồ sơ nhân sự gồm cây thư mục, quy ước đặt tên file, checklist giấy tờ bắt buộc theo từng giai đoạn, và bảng theo dõi hồ sơ thiếu. Định dạng: Artifact, có ví dụ tên file. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m44",
    title: "Trợ lý trả lời câu hỏi HR lặp lại (policy Q&A) bằng Project",
    durationMin: 20,
    level: 3,
    skills: ["hr-hanh-chinh-ops", "hr-tu-dong-hoa"],
    content:
      "Nạp toàn bộ chính sách vào Project, viết Custom Instructions 'chỉ trả lời theo tài liệu, không bịa, không có thì nói không có' → trở thành tổng đài tự trả lời câu hỏi nhân viên (phép, lương, quy trình). Giảm mạnh câu hỏi lặp đổ về HR.",
    learnings: [
      "Cấu hình Project trả lời theo tài liệu",
      "Chống bịa: chỉ dựa tài liệu nội bộ",
      "Giảm tải câu hỏi lặp cho HR",
    ],
    practicePrompt:
      "Bạn là trợ lý HR, CHỈ trả lời dựa trên chính sách công ty đã nạp vào Project, không bịa. Bối cảnh: nhân viên hỏi về phép/lương/quy trình. Yêu cầu: trả lời đúng theo tài liệu, trích phần liên quan; nếu không có thì nói rõ. Định dạng: câu trả lời ngắn, có trích dẫn. Câu hỏi: [DÁN CÂU HỎI].",
  },

  // ----------------------------------------------------------------- //
  // TRACK 7 — PHÂN TÍCH DỮ LIỆU HR & BÁO CÁO (6 bài)                   //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m45",
    title: "Đọc & hiểu số liệu HR: turnover, headcount, tỉ lệ tuyển",
    durationMin: 18,
    level: 1,
    skills: ["hr-phan-tich-du-lieu"],
    content:
      "Bài nền phân tích: Claude giải thích các chỉ số HR cốt lõi (tỉ lệ nghỉ việc, headcount, time-to-hire, tỉ lệ giữ chân, cost-per-hire) bằng ngôn ngữ dễ hiểu và cách tính. Hiểu chỉ số trước, phân tích sau.",
    learnings: [
      "Ý nghĩa các chỉ số HR cốt lõi",
      "Cách tính & ngưỡng tham khảo",
      "Chỉ số nào quan trọng với công ty bạn",
    ],
    practicePrompt:
      "Bạn là chuyên viên People Analytics, giải thích cho người mới. Bối cảnh: tôi chưa quen các chỉ số HR. Yêu cầu: giải thích turnover, retention, time-to-hire, cost-per-hire, absenteeism — định nghĩa, công thức, ví dụ số, ngưỡng nào đáng lo. Định dạng: bảng (Chỉ số | Công thức | Ví dụ | Ngưỡng lưu ý). Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m46",
    title: "Upload Excel nhân sự → Claude phân tích & tìm bất thường",
    durationMin: 25,
    level: 2,
    skills: ["hr-phan-tich-du-lieu"],
    content:
      "Upload bảng dữ liệu nhân sự (ẩn danh), nhờ Claude tính các chỉ số, phát hiện bất thường (phòng nghỉ việc cao, lệch giới, khoảng trống dữ liệu) và trả lời câu hỏi bằng lời thường: 'phòng nào nghỉ nhiều nhất quý này?'. Học viên muốn 'dựa vào data ra insight' — đây là bài lõi.",
    learnings: [
      "Đưa file & câu hỏi đúng cách",
      "Đọc bất thường & nguyên nhân khả dĩ",
      "Hỏi đáp dữ liệu bằng ngôn ngữ thường",
    ],
    practicePrompt:
      "Bạn là chuyên viên phân tích dữ liệu nhân sự. Bối cảnh: đây là bảng nhân sự quý này (ẩn danh). Yêu cầu: tính turnover theo phòng, headcount đầu/cuối kỳ, và chỉ ra 3 bất thường đáng chú ý kèm giả thuyết nguyên nhân; sẵn sàng trả lời thêm câu hỏi của tôi bằng lời thường. Định dạng: bảng số liệu + phần nhận xét. Dữ liệu: [UPLOAD FILE]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m47",
    title: "Báo cáo nhân sự định kỳ tự động: mẫu + tóm tắt insight",
    durationMin: 22,
    level: 2,
    skills: ["hr-phan-tich-du-lieu", "hr-hanh-chinh-ops"],
    content:
      "Dựng mẫu báo cáo nhân sự tháng/quý một lần, lần sau chỉ dán số liệu mới → Claude điền và viết phần 'điểm nổi bật' bằng lời. Báo cáo nhanh chóng là nhu cầu lặp lại của nhiều học viên. Nạp mẫu vào Project để chuẩn hóa.",
    learnings: [
      "Dựng mẫu báo cáo tái dùng",
      "Tự động sinh phần tóm tắt insight",
      "Chuẩn hóa báo cáo qua Project",
    ],
    practicePrompt:
      "Bạn là chuyên viên phân tích nhân sự. Bối cảnh: báo cáo nhân sự hằng tháng. Yêu cầu: tạo mẫu báo cáo (headcount, tuyển/nghỉ, turnover, đào tạo, điểm nổi bật); sau khi tôi dán số liệu, điền vào và viết tóm tắt điều hành 5 dòng. Định dạng: mẫu báo cáo tái dùng + phần tóm tắt. Dữ liệu (bước 2): [DÁN/UPLOAD SỐ LIỆU]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m48",
    title: "Dashboard & biểu đồ HR bằng Artifacts",
    durationMin: 22,
    level: 2,
    skills: ["hr-phan-tich-du-lieu", "hr-tu-dong-hoa"],
    content:
      "Nhờ Claude tạo dashboard trực quan (biểu đồ headcount, turnover, phễu tuyển) dưới dạng Artifact tương tác từ dữ liệu bạn đưa — không cần biết code. Dùng để trình bày cho lãnh đạo đẹp & nhanh.",
    learnings: [
      "Tạo biểu đồ HR không cần code",
      "Dashboard tương tác bằng Artifact",
      "Chuẩn bị số liệu cho trực quan hóa",
    ],
    practicePrompt:
      "Bạn là chuyên viên trực quan hóa dữ liệu HR. Bối cảnh: đây là dữ liệu nhân sự. Yêu cầu: tạo dashboard HR dạng Artifact gồm biểu đồ headcount theo phòng, turnover 6 tháng, phễu tuyển dụng, cho phép lọc theo phòng. Định dạng: Artifact tương tác. Dữ liệu: [DÁN/UPLOAD DỮ LIỆU]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m49",
    title: "Headcount planning & dự báo nhu cầu nhân sự (Claude in Excel)",
    durationMin: 22,
    level: 3,
    skills: ["hr-phan-tich-du-lieu", "hr-cb-luong"],
    content:
      "Dùng Claude in Excel để dựng mô hình kế hoạch nhân sự: dự báo headcount theo tăng trưởng, chi phí lương tương ứng, kịch bản tuyển theo quý. Theo đúng hướng dẫn headcount planning của Claude cho HR. Mọi giả định nêu rõ để lãnh đạo điều chỉnh.",
    learnings: [
      "Mô hình dự báo headcount theo kịch bản",
      "Gắn kế hoạch tuyển với chi phí lương",
      "Nêu rõ giả định để ra quyết định",
    ],
    practicePrompt:
      "Bạn là chuyên viên hoạch định nhân sự, làm việc trên bảng tính (Claude in Excel). Bối cảnh: công ty [QUY MÔ] người, tăng trưởng [X]%. Yêu cầu: dựng mô hình headcount planning 12 tháng (dự báo nhân sự theo phòng, chi phí lương ước tính, kế hoạch tuyển theo quý, 2 kịch bản); nêu rõ giả định. Định dạng: bảng mô hình + phần giả định. Dữ liệu: [UPLOAD FILE]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m50",
    title: "Phân tích nguyên nhân nghỉ việc & đề xuất giữ chân",
    durationMin: 22,
    level: 3,
    skills: ["hr-phan-tich-du-lieu", "hr-quan-he-chinh-sach"],
    content:
      "Kết hợp dữ liệu nghỉ việc + nội dung phỏng vấn thôi việc (ẩn danh), Claude tìm mẫu hình (nghỉ nhiều ở mốc nào, phòng nào, lý do lặp), và đề xuất chương trình giữ chân ưu tiên theo tác động/chi phí. Biến dữ liệu thành hành động giữ người.",
    learnings: [
      "Tìm mẫu hình nghỉ việc",
      "Tổng hợp lý do từ exit interview",
      "Đề xuất giữ chân theo tác động/chi phí",
    ],
    practicePrompt:
      "Bạn là chuyên viên People Analytics. Bối cảnh: đây là dữ liệu nghỉ việc + các phỏng vấn thôi việc (ẩn danh). Yêu cầu: phân tích mốc nghỉ tập trung, phòng rủi ro, 3 nguyên nhân lặp; đề xuất 5 hành động giữ chân xếp theo tác động/chi phí. Định dạng: phần phân tích + bảng đề xuất ưu tiên. Dữ liệu: [UPLOAD FILE]. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },

  // ----------------------------------------------------------------- //
  // TRACK 8 — TỰ ĐỘNG HÓA & NĂNG SUẤT HR (6 bài)                       //
  // ----------------------------------------------------------------- //
  {
    id: "nhan-su-m51",
    title: "Xây thư viện prompt HR dùng lại hằng ngày",
    durationMin: 18,
    level: 1,
    skills: ["hr-tu-dong-hoa"],
    content:
      "Gom các prompt tốt thành thư viện cá nhân theo nhóm việc (tuyển dụng, email, chính sách, báo cáo). Mỗi prompt có [chỗ điền]. Đây là bước đầu của 'một lần dựng, dùng mãi' — và cũng là nền để Agent gợi ý prompt theo việc bạn chọn.",
    learnings: [
      "Tổ chức thư viện prompt theo nhóm việc",
      "Thiết kế prompt có [chỗ điền]",
      "Thói quen lưu lại prompt hiệu quả",
    ],
    practicePrompt:
      "Bạn là chuyên gia năng suất cho HR. Bối cảnh: 3 việc HR tôi làm nhiều nhất là [..]. Yêu cầu: tạo thư viện 9 prompt mẫu (3 mỗi việc) theo chuẩn Vai trò + Bối cảnh + Yêu cầu + Định dạng, có [chỗ điền] và ghi chú khi nào dùng. Định dạng: Artifact để lưu, nhóm theo việc. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m52",
    title: "Dùng Project + Custom Instructions làm trợ lý HR riêng của bạn",
    durationMin: 20,
    level: 2,
    skills: ["hr-tu-dong-hoa", "hr-nen-tang"],
    content:
      "Nâng cấp từ bài nền: tinh chỉnh trợ lý HR riêng — Custom Instructions ghi rõ vai trò, giọng, ràng buộc (không bịa, luôn ẩn danh), tài liệu nền theo từng mảng việc. Có thể tạo nhiều Project: 'Tuyển dụng', 'Chính sách', 'Báo cáo' cho gọn.",
    learnings: [
      "Tinh chỉnh Custom Instructions nâng cao",
      "Tổ chức nhiều Project theo mảng việc",
      "Ràng buộc an toàn trong chỉ dẫn",
    ],
    practicePrompt:
      "Bạn là chuyên gia thiết lập Claude cho HR. Bối cảnh: tôi đang dựng Project Trợ lý Tuyển dụng. Yêu cầu: viết Custom Instructions chi tiết gồm vai trò, giọng xưng hô, quy tắc ẩn danh dữ liệu, định dạng đầu ra ưa thích, và việc nên/không nên làm. Định dạng: đoạn chỉ dẫn sẵn dán. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m53",
    title: "Quy trình 'một lần dựng, dùng mãi': biến việc lặp thành mẫu Claude",
    durationMin: 20,
    level: 2,
    skills: ["hr-tu-dong-hoa"],
    content:
      "Nhận diện việc HR lặp hằng tuần (sàng lọc CV, báo cáo, trả lời chính sách) và biến mỗi việc thành một 'mẫu vận hành' với Claude: prompt chuẩn + tài liệu nền + định dạng đầu ra. Tư duy quy trình giúp tiết kiệm hệ thống chứ không lẻ tẻ.",
    learnings: [
      "Nhận diện việc lặp đáng tự động",
      "Đóng gói thành mẫu vận hành tái dùng",
      "Tư duy tiết kiệm theo hệ thống",
    ],
    practicePrompt:
      "Bạn là chuyên gia tối ưu quy trình cho HR. Bối cảnh: tôi làm lặp lại việc [MÔ TẢ] mỗi tuần. Yêu cầu: đóng gói thành quy trình chuẩn với Claude gồm prompt mẫu, tài liệu cần nạp, các bước, định dạng kết quả; ước tính thời gian tiết kiệm. Định dạng: quy trình đánh số + phần ước tính. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m54",
    title: "Kết nối Claude với Google Drive/email để xử lý tài liệu",
    durationMin: 20,
    level: 2,
    skills: ["hr-tu-dong-hoa", "hr-hanh-chinh-ops"],
    content:
      "Bật connectors để Claude đọc trực tiếp tài liệu trên Google Drive (JD, chính sách, báo cáo) hay tóm tắt email — không cần copy thủ công. Học cách dùng an toàn: chỉ kết nối thư mục cần thiết, kiểm soát quyền truy cập dữ liệu nhân sự.",
    learnings: [
      "Kết nối Drive/email cho Claude",
      "Xử lý tài liệu không cần copy tay",
      "Kiểm soát quyền & an toàn dữ liệu",
    ],
    practicePrompt:
      "Bạn là chuyên gia tích hợp công cụ AI cho HR. Bối cảnh: tôi muốn kết nối Google Drive với Claude an toàn cho công việc HR. Yêu cầu: hướng dẫn từng bước kết nối, nên cấp quyền thư mục nào, rủi ro cần tránh với dữ liệu nhân sự nhạy cảm. Định dạng: các bước đánh số + phần Lưu ý an toàn. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m55",
    title: "Tư duy workflow tự động hóa HR — Claude làm 'bộ não'",
    durationMin: 22,
    level: 3,
    skills: ["hr-tu-dong-hoa"],
    content:
      "Bước nâng cao: nhìn một quy trình HR (vd nhận CV → sàng lọc → mời PV) như một luồng tự động, trong đó Claude lo phần 'suy nghĩ' (đọc, phân loại, soạn thư) còn công cụ kết nối (n8n/Lark/Zapier) lo phần chuyển tiếp. Bài cho bạn bản đồ tư duy để phối hợp với người làm kỹ thuật.",
    learnings: [
      "Nhìn quy trình HR như một luồng tự động",
      "Phân vai: Claude 'suy nghĩ', tool 'chuyển tiếp'",
      "Phối hợp với người dựng hệ thống",
    ],
    practicePrompt:
      "Bạn là chuyên gia tự động hóa quy trình cho HR. Bối cảnh: tôi muốn tự động hóa quy trình [VD: nhận CV → sàng lọc → mời PV]. Yêu cầu: vẽ sơ đồ luồng, chỉ rõ bước nào Claude làm (và prompt gì), bước nào cần công cụ kết nối, dữ liệu đi qua đâu. Định dạng: mô tả sơ đồ luồng theo bước. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
  {
    id: "nhan-su-m56",
    title: "Đo thời gian tiết kiệm & nhân rộng cho cả phòng HR",
    durationMin: 18,
    level: 3,
    skills: ["hr-tu-dong-hoa", "hr-phan-tich-du-lieu"],
    content:
      "Bài tổng kết: lập bảng theo dõi việc nào đã giao cho Claude, tiết kiệm bao nhiêu giờ/tuần, chất lượng ra sao; chọn 3 'best practice' để hướng dẫn lại đồng nghiệp. Biến năng suất cá nhân thành năng suất cả phòng — đúng tinh thần 'doanh nghiệp tinh gọn nhờ AI'.",
    learnings: [
      "Đo lường thời gian & chất lượng tiết kiệm",
      "Chọn best practice để nhân rộng",
      "Lan tỏa năng lực AI cho cả phòng",
    ],
    practicePrompt:
      "Bạn là chuyên gia năng suất HR. Bối cảnh: phòng HR muốn đo và nhân rộng hiệu quả AI. Yêu cầu: tạo bảng theo dõi AI tiết kiệm thời gian (cột: việc, tần suất, giờ tiết kiệm/tuần, chất lượng 1-5, ghi chú) và hướng dẫn 1 trang để đào tạo lại đồng nghiệp. Định dạng: Artifact bảng + phần hướng dẫn. Nếu thiếu thông tin để làm sát, hãy hỏi lại tôi 1–3 câu trước khi bắt đầu.",
  },
];

// --- Starter kit: prompt mẫu + công cụ gợi ý (Claude-first) -------------------
const HR_STARTER_KIT: Role["starterKit"] = {
  prompts: [
    {
      title: "JD nhanh từ vài gạch đầu dòng",
      prompt:
        "Bạn là chuyên viên tuyển dụng. Viết JD cho vị trí [CHỨC DANH] tại công ty [NGÀNH, QUY MÔ]. Nhiệm vụ chính: [3-4 gạch đầu dòng]. Trình bày: Mô tả công việc · Yêu cầu · Quyền lợi. Tránh ngôn ngữ phân biệt tuổi/giới.",
    },
    {
      title: "Sàng lọc & xếp hạng CV",
      prompt:
        "Đây là JD và các CV (đã ẩn danh). Chấm mỗi CV theo: Kinh nghiệm /40 · Kỹ năng /40 · Phù hợp /20. Trả bảng xếp hạng + 2 dòng nhận xét + cờ đỏ nếu có. [DÁN JD + CV]",
    },
    {
      title: "Kế hoạch onboarding 30-60-90",
      prompt:
        "Lập kế hoạch onboarding 30-60-90 ngày cho vị trí [CHỨC DANH]. Mỗi mốc: mục tiêu, việc cần làm, người hỗ trợ, tiêu chí đánh giá. Xuất bảng.",
    },
    {
      title: "Nhận xét đánh giá hiệu suất",
      prompt:
        "Viết nhận xét đánh giá cuối kỳ dựa trên: thành tích [..], điểm cải thiện [..], hành vi [..]. Cân bằng ghi nhận & góp ý, giọng chuyên nghiệp, có gợi ý phát triển.",
    },
    {
      title: "Phân tích file nhân sự",
      prompt:
        "Đây là bảng nhân sự quý này (ẩn danh). Tính turnover theo phòng, headcount đầu/cuối kỳ, và chỉ ra 3 bất thường kèm giả thuyết nguyên nhân. [UPLOAD FILE]",
    },
    {
      title: "Email HR trong 2 phút",
      prompt:
        "Viết email [mục đích] gửi [đối tượng], giọng [trang trọng/thân thiện], ≤150 từ, có tiêu đề và lời kêu gọi rõ. Ý chính: [gạch đầu dòng].",
    },
  ],
  tools: [
    {
      name: "Claude",
      color: "#D97757",
      desc: "Trợ lý chính của chương trình (bản Pro): Projects, Artifacts, đọc file dài, viết tài liệu HR.",
      useFor: "Mọi việc chữ nghĩa HR: JD, email, chính sách, đánh giá, phân tích file.",
    },
    {
      name: "Claude in Excel",
      color: "#1D7044",
      desc: "Claude làm việc trực tiếp trên bảng tính.",
      useFor: "Đối soát bảng lương, headcount planning, công thức & biểu đồ.",
    },
    {
      name: "NotebookLM",
      color: "#4A6CF7",
      desc: "Hỏi đáp trên bộ tài liệu lớn, tạo bản tóm tắt/âm thanh.",
      useFor: "Tra cứu sổ tay, chính sách, tài liệu đào tạo dài.",
    },
    {
      name: "Gamma",
      color: "#7C5CFC",
      desc: "Tạo slide/đề xuất đẹp trong vài phút.",
      useFor: "Slide đào tạo, báo cáo nhân sự trình lãnh đạo.",
    },
  ],
};

// --- Quiz tình huống (5 câu) -------------------------------------------------
const HR_QUIZ: Role["quiz"] = [
  {
    question:
      "Bạn muốn nhờ Claude sàng lọc 30 CV. Cách làm an toàn & hiệu quả nhất là?",
    options: [
      "Dán nguyên CV có đầy đủ tên, SĐT, CCCD để Claude chấm chính xác nhất",
      "Ẩn thông tin nhận dạng, đưa kèm JD + tiêu chí chấm rõ ràng, rồi tự đọc lại top ứng viên",
      "Chỉ đưa tên ứng viên và hỏi 'người này có tốt không'",
      "Nhờ Claude tự quyết định loại ai mà không cần mình xem lại",
    ],
    correctIndex: 1,
    explanation:
      "Luôn ẩn dữ liệu nhận dạng trước khi đưa lên AI, cung cấp tiêu chí rõ để chấm nhất quán, và tự rà lại top CV — AI hỗ trợ ra quyết định chứ không thay quyết định tuyển dụng.",
  },
  {
    question:
      "Điều gì khiến một 'Project Trợ lý HR' trên Claude hữu ích hơn hẳn chat thường?",
    options: [
      "Nó trả lời nhanh hơn",
      "Nó lưu sẵn tài liệu công ty + chỉ dẫn nên mọi câu trả lời bám đúng bối cảnh, không phải gõ lại context",
      "Nó miễn phí",
      "Nó tự động gửi email cho nhân viên",
    ],
    correctIndex: 1,
    explanation:
      "Project giữ tài liệu nền (chính sách, JD mẫu, giọng văn) và Custom Instructions, nên Claude luôn hiểu bối cảnh công ty bạn mà không cần nhập lại mỗi lần.",
  },
  {
    question:
      "Claude soạn cho bạn một quyết định kỷ luật. Bước tiếp theo đúng đắn là?",
    options: [
      "Gửi ngay cho nhân viên vì AI viết đúng chuẩn rồi",
      "Coi đây là bản nháp, đối chiếu quy trình & Bộ luật Lao động và để người có thẩm quyền/pháp lý duyệt trước khi ban hành",
      "Đăng lên nhóm công ty để mọi người góp ý",
      "Lưu lại và không cần ai xem",
    ],
    correctIndex: 1,
    explanation:
      "Văn bản pháp lý/kỷ luật phải tuân thủ đúng trình tự luật và được người có thẩm quyền duyệt. Claude chỉ làm nháp; trách nhiệm cuối cùng thuộc về con người.",
  },
  {
    question:
      "Học viên than 'đưa bảng lương Excel cho AI nhưng không hiệu quả'. Nguyên nhân thường gặp nhất là?",
    options: [
      "AI không bao giờ làm được Excel",
      "Chưa mô tả rõ quy tắc tính và chưa nêu rõ cần kiểm tra/đầu ra gì; đưa dữ liệu thiếu ngữ cảnh",
      "Phải mua thêm phần mềm",
      "Excel quá hiện đại cho AI",
    ],
    correctIndex: 1,
    explanation:
      "Mấu chốt là cách đặt bài toán: nêu rõ quy tắc tính, ẩn danh dữ liệu, yêu cầu cụ thể (dò lỗi/viết công thức/ tóm tắt) và định dạng kết quả. Có thể dùng Claude in Excel để thao tác trực tiếp.",
  },
  {
    question:
      "Mục tiêu cuối cùng của track 'Tự động hóa & năng suất' cho HR là gì?",
    options: [
      "Thay thế hoàn toàn nhân viên HR bằng AI",
      "Biến việc lặp thành mẫu dùng lại, đo thời gian tiết kiệm và nhân rộng cách làm cho cả phòng",
      "Dùng càng nhiều công cụ AI càng tốt",
      "Tự động gửi mọi email mà không cần duyệt",
    ],
    correctIndex: 1,
    explanation:
      "Tự động hóa HR hiệu quả là đóng gói việc lặp thành quy trình chuẩn với Claude, đo lường lợi ích thực và lan tỏa best practice — con người vẫn kiểm soát và chịu trách nhiệm.",
  },
];

// --- Vai trò HR hoàn chỉnh ---------------------------------------------------
export const HR_ROLE: Role = {
  id: "nhan-su",
  label: "Nhân viên Nhân sự (HR)",
  shortLabel: "Nhân sự / HR",
  icon: "👥",
  color: "#6C5CE7",
  modules: withHrAttachedFiles(HR_MODULES),
  starterKit: HR_STARTER_KIT,
  quiz: HR_QUIZ,
};

export default HR_ROLE;
