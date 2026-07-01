// Template vai trò — TRÁI TIM CỦA SẢN PHẨM (CLAUDE.md §7).
// Rule-based, KHÔNG dùng AI Agent. Mỗi vai trò có modules + starter kit + quiz.
// Dữ liệu lấy từ prototype + được tinh chỉnh cho GĐ1.
// GĐ2 — vai trò HR (nhan-su) tách ở roles-hr.ts để dễ bảo trì.

import { HR_ROLE, HR_SKILL_LABELS } from "./roles-hr";

export type ModuleStatus = "chua-hoc" | "dang-hoc" | "hoan-thanh";

export type RoleModule = {
  id: string;
  title: string;
  durationMin: number;
  content: string;
  learnings: string[];
  // Cấp độ module: 1 = nhập môn, 2 = trung cấp, 3 = nâng cao.
  // Người >5 điểm AI sẽ skip cấp độ 1.
  level: 1 | 2 | 3;
  // Module nền tảng chung (công cụ AI cơ bản + viết prompt): tự gắn vào MỌI
  // lộ trình của builder, không phải nhân bản (spec §6.1 common foundation).
  isFoundation?: boolean;
  // Prompt thực hành chính hiển thị ở Bước 1 của màn bài học (nếu có).
  practicePrompt?: string;
  // Slug kỹ năng module này dạy — khớp bảng skills/module_skills (mục 3 builder).
  // Demo mode dùng trực tiếp; real mode seed quan hệ qua migration 0014.
  skills?: string[];
  // Tool chuyên dụng override tool chính công ty (mục 3). NULL/bỏ trống = dùng tool chính.
  // Giá trị khớp key trong lib/ai-tools-config.ts (vd 'chatgpt-image','canva-ai','runway').
  tool?: string;
  toolReason?: string;
  // Rubric chấm điểm theo tiêu chí (mục 1). Thiếu → chấm tự do như Phase 1.
  rubric?: RubricCriterion[];
  // File mẫu hệ thống đính kèm cho bài thực hành (Phần C §5). Dữ liệu ẩn danh,
  // có "điểm bẫy" để kiểm tra học viên. Null/bỏ trống = bài không có file.
  attachedFile?: AttachedFile;
};

// Tiêu chí rubric chấm bài thực hành (mục 1). Tổng maxPoints nên = 100.
export type RubricCriterion = {
  criteria: string;
  maxPoints: number;
};

// File mẫu đính kèm bài học (Phần C §5). path trỏ tới public/files/.
export type AttachedFile = {
  name: string;
  path: string;
  desc: string;
};

// Slug kỹ năng dùng chung — khớp seed trong migration 20260611110000_skills_module_skills.
export const SKILL_LABELS: Record<string, string> = {
  "nen-tang-ai": "Nền tảng AI cơ bản",
  "viet-prompt": "Viết prompt hiệu quả",
  "an-toan-du-lieu": "An toàn dữ liệu khi dùng AI",
  "van-ban-hanh-chinh": "Soạn văn bản hành chính",
  "loc-cv": "Lọc CV tuyển dụng",
  "email-noi-bo": "Viết email nội bộ",
  "cham-cong-nghi-phep": "Chấm công & nghỉ phép",
  "tom-tat-tai-lieu": "Tóm tắt tài liệu & biên bản",
  "danh-gia-chinh-sach": "Đánh giá & chính sách nhân sự",
  "phan-tich-du-lieu-ns": "Phân tích dữ liệu nhân sự",
  "cb-tinh-luong": "C&B & kiểm tra bảng lương",
  "dao-tao-ld": "Thiết kế đào tạo / L&D",
  ...HR_SKILL_LABELS,
};

export type RoleStarterPrompt = {
  title: string;
  prompt: string;
};

export type RoleTool = {
  name: string;
  color: string;
  desc: string;
  useFor: string;
  /** Tuỳ chọn — mặc định lấy từ `lib/ai-tool-urls.ts`. */
  url?: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Role = {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  modules: RoleModule[];
  starterKit: {
    prompts: RoleStarterPrompt[];
    tools: RoleTool[];
  };
  quiz: QuizQuestion[];
};

export const ROLES: Record<string, Role> = {
  // GĐ2 — vai trò HR (56 bài, định nghĩa ở roles-hr.ts)
  "nhan-su": HR_ROLE,
  "kinh-doanh": {
    id: "kinh-doanh",
    label: "Nhân viên Kinh doanh",
    shortLabel: "Kinh doanh / Bán hàng",
    icon: "🤝",
    color: "#DB6E4C",
    modules: [
      {
        id: "kinh-doanh-m1",
        title: "AI là gì? Nó giúp được gì cho người bán hàng",
        durationMin: 15,
        level: 1,
        content:
          "AI (Artificial Intelligence) là công cụ giúp bạn xử lý nhanh những việc lặp lại: soạn email, viết kịch bản, gợi ý ý tưởng. Với nhân viên bán hàng, AI giống như một trợ lý ngồi cạnh — bạn ra lệnh, nó làm nháp, bạn duyệt và gửi đi.",
        learnings: [
          "Hiểu AI bằng ngôn ngữ đời thường",
          "3 việc AI làm tốt nhất cho sales",
          "Điều AI KHÔNG thay được con người",
        ],
      },
      {
        id: "kinh-doanh-m2",
        title: "Dùng ChatGPT viết email & tin nhắn chào hàng",
        durationMin: 20,
        level: 1,
        content:
          "Một prompt tốt = vai trò + bối cảnh + yêu cầu cụ thể. VD: 'Bạn là nhân viên bán đệm cao cấp. Viết email chào khách công ty 50 nhân viên vừa chuyển văn phòng, giọng thân thiện, tối đa 120 từ, kết bằng lời mời đặt lịch xem hàng.'",
        learnings: [
          "Cấu trúc prompt tốt",
          "Viết email chào khách trong 2 phút",
          "Cá nhân hóa theo từng khách",
        ],
      },
      {
        id: "kinh-doanh-m3",
        title: "Kịch bản tư vấn & xử lý từ chối bằng AI",
        durationMin: 25,
        level: 2,
        content:
          "AI giúp bạn luyện trả lời các câu từ chối khó nhằn: 'đắt quá', 'để em suy nghĩ', 'chỗ khác rẻ hơn'. Nhờ AI đóng vai khách khó tính, bạn phản xạ trước khi gặp khách thật.",
        learnings: [
          "Sinh nhiều phương án trả lời",
          "Xử lý 'đắt quá', 'để em suy nghĩ'",
          "Luyện phản xạ với AI đóng vai khách",
        ],
      },
      {
        id: "kinh-doanh-m4",
        title: "Phân tích nhu cầu khách từ lịch sử chat",
        durationMin: 20,
        level: 2,
        attachedFile: {
          name: "lich-su-chat-khach-mau.txt",
          path: "/files/lich-su-chat-khach-mau.txt",
          desc: "Đoạn chat với khách (ẩn danh). Thử nhờ AI tóm tắt nhu cầu, tín hiệu mua và bước tiếp theo.",
        },
        content:
          "Copy lịch sử chat với khách, nhờ AI tóm tắt + chỉ ra tín hiệu mua hàng + gợi ý bước tiếp theo. Tiết kiệm 30 phút/khách.",
        learnings: [
          "Tóm tắt hội thoại dài",
          "Nhận ra tín hiệu mua hàng",
          "Gợi ý bước tiếp theo",
        ],
      },
      {
        id: "kinh-doanh-m5",
        title: "Soạn báo giá & đề xuất nhanh với AI",
        durationMin: 20,
        level: 3,
        content:
          "AI tạo bảng so sánh gói, viết đề xuất thuyết phục. Nhưng SỐ LIỆU PHẢI tự kiểm tra — AI hay 'bịa' giá tiền.",
        learnings: [
          "Tạo bảng so sánh gói",
          "Viết đề xuất thuyết phục",
          "Kiểm tra số liệu trước khi gửi",
        ],
      },
      {
        id: "kinh-doanh-m6",
        title: "Đạo đức & rủi ro: điều KHÔNG nên đưa cho AI",
        durationMin: 15,
        level: 3,
        content:
          "KHÔNG dán số điện thoại, mã số thuế, hợp đồng mật vào ChatGPT công cộng. AI có thể bịa cam kết bạn không thể giữ. Luôn đọc lại trước khi gửi.",
        learnings: [
          "Dữ liệu cá nhân khách hàng",
          "Tránh AI 'bịa' cam kết",
          "Luôn đọc lại trước khi gửi",
        ],
      },
    ],
    starterKit: {
      prompts: [
        {
          title: "Email chào khách lần đầu",
          prompt:
            "Bạn là nhân viên bán hàng [SẢN PHẨM]. Viết email chào khách [LOẠI KHÁCH], giọng thân thiện, ≤120 từ, kết bằng lời mời đặt lịch xem/gọi.",
        },
        {
          title: "Xử lý 'đắt quá'",
          prompt:
            "Khách hàng nói 'bên em đắt quá so với chỗ khác'. Gợi ý 3 cách trả lời tập trung vào giá trị thay vì giảm giá. Mỗi cách 2-3 câu.",
        },
        {
          title: "Tóm tắt cuộc gọi tư vấn",
          prompt:
            "Tóm tắt cuộc gọi sau thành: (1) nhu cầu khách, (2) phản đối chính, (3) bước tiếp theo nên làm. [DÁN NỘI DUNG GỌI]",
        },
      ],
      tools: [
        {
          name: "ChatGPT",
          color: "#10A37F",
          desc: "Trợ lý đa năng: soạn email, kịch bản, trả lời nhanh.",
          useFor: "Soạn email chào hàng & luyện xử lý từ chối",
        },
        {
          name: "Claude",
          color: "#D97757",
          desc: "Viết dài mạch lạc, đọc tài liệu dài.",
          useFor: "Đọc & tóm tắt hồ sơ khách, soạn đề xuất",
        },
        {
          name: "Gamma",
          color: "#7C5CFC",
          desc: "Tạo slide/đề xuất đẹp trong vài phút.",
          useFor: "Làm bài giới thiệu sản phẩm cho khách",
        },
        {
          name: "Fireflies",
          color: "#4A6CF7",
          desc: "Tự động ghi & tóm tắt cuộc gọi.",
          useFor: "Ghi lại nội dung cuộc gọi tư vấn",
        },
      ],
    },
    quiz: [
      {
        question:
          "Khách nhắn: «Bên em đắt quá so với chỗ khác». Bạn muốn dùng AI soạn câu trả lời. Cách làm ĐÚNG nhất?",
        options: [
          "Dán nguyên thông tin khách (tên, SĐT, công ty) vào ChatGPT rồi bảo nó trả lời",
          "Mô tả tình huống chung (không kèm dữ liệu cá nhân) và nhờ AI gợi ý 3 hướng trả lời tập trung vào giá trị",
          "Bảo AI tự bịa một mức giảm giá để chốt đơn",
          "Gửi luôn câu trả lời AI viết mà không đọc lại",
        ],
        correctIndex: 1,
        explanation:
          "Không đưa dữ liệu cá nhân của khách vào công cụ AI công cộng. Hãy mô tả tình huống chung, lấy gợi ý rồi tự điều chỉnh và kiểm tra trước khi gửi.",
      },
      {
        question: "AI giúp người bán hàng việc nào TỐT nhất?",
        options: [
          "Tự động hiểu cảm xúc thật của khách qua điện thoại",
          "Gợi ý ý tưởng & soạn nháp email/kịch bản để bạn chỉnh sửa",
          "Thay bạn ra quyết định giảm giá",
          "Đảm bảo chốt được 100% đơn",
        ],
        correctIndex: 1,
        explanation:
          "AI mạnh ở việc tạo nháp, gợi ý ý tưởng, tiết kiệm thời gian — còn quyết định cuối cùng vẫn là con người.",
      },
      {
        question:
          "Prompt nào sẽ cho kết quả TỐT hơn khi nhờ AI viết email chào hàng?",
        options: [
          "«Viết email bán hàng»",
          "«Viết email chào ghế văn phòng cao cấp, gửi công ty 50 nhân viên vừa chuyển văn phòng, giọng thân thiện, ≤120 từ, có lời mời đặt lịch xem hàng»",
          "«Email»",
          "«Bán đi»",
        ],
        correctIndex: 1,
        explanation:
          "Prompt càng cụ thể (đối tượng, bối cảnh, giọng văn, độ dài, mục tiêu) thì AI trả kết quả càng sát thực tế.",
      },
      {
        question:
          "Bạn muốn AI tóm tắt lịch sử chat với khách. Thông tin nào nên giữ lại?",
        options: [
          "Nhu cầu, băn khoăn, sản phẩm quan tâm và bước tiếp theo",
          "Số điện thoại cá nhân, địa chỉ nhà và mã hợp đồng",
          "Mật khẩu CRM để AI tự truy cập",
          "Mọi tin nhắn riêng tư không liên quan đến bán hàng",
        ],
        correctIndex: 0,
        explanation:
          "Khi dùng AI với dữ liệu khách, hãy giữ bối cảnh nghiệp vụ cần phân tích và loại bỏ thông tin định danh hoặc nhạy cảm.",
      },
      {
        question:
          "Sau cuộc gọi tư vấn, cách nhờ AI hỗ trợ follow-up nào hợp lý nhất?",
        options: [
          "Tạo 2 phiên bản tin nhắn nhắc lại nhu cầu, lợi ích chính và đề xuất lịch hẹn tiếp theo",
          "Để AI gửi tự động cho khách mà bạn không đọc",
          "Yêu cầu AI hứa chắc giảm giá dù chưa được duyệt",
          "Nhờ AI phán đoán khách có tiền hay không",
        ],
        correctIndex: 0,
        explanation:
          "AI nên làm bản nháp follow-up dựa trên dữ kiện thật. Sales cần kiểm tra lại giọng văn, quyền giảm giá và cam kết trước khi gửi.",
      },
      {
        question:
          "Bạn muốn luyện xử lý từ chối 'để anh/chị hỏi lại sếp'. Prompt nào tốt nhất?",
        options: [
          "Đóng vai khách B2B đang cần xin duyệt ngân sách, đưa 4 phản hồi khó và chấm cách tôi trả lời",
          "Làm khách khó đi",
          "Chốt đơn bằng mọi giá",
          "Tự nghĩ ra ngân sách của khách",
        ],
        correctIndex: 0,
        explanation:
          "Role-play hiệu quả khi bối cảnh rõ và có tiêu chí phản hồi. AI giúp luyện tập, không thay cuộc trò chuyện thật với khách.",
      },
      {
        question:
          "Khi dùng AI soạn đề xuất bán hàng, phần nào bắt buộc bạn tự kiểm tra?",
        options: [
          "Giá, thời hạn, cam kết dịch vụ và điều khoản thương mại",
          "Tiêu đề có hay không",
          "Độ dài đoạn mở đầu",
          "AI dùng nhiều từ chuyên nghiệp",
        ],
        correctIndex: 0,
        explanation:
          "Các thông tin có ràng buộc kinh doanh phải được kiểm tra với chính sách công ty. AI có thể viết mượt nhưng bịa chi tiết.",
      },
      {
        question:
          "AI gợi ý giảm giá sâu để dễ chốt đơn. Hành động đúng là gì?",
        options: [
          "Dùng ngay vì AI tối ưu chốt sale",
          "Đối chiếu chính sách giá và xin duyệt trước khi đề xuất",
          "Nói với khách là hệ thống đã duyệt",
          "Giấu quản lý để thử nghiệm",
        ],
        correctIndex: 1,
        explanation:
          "AI không có quyền quyết định chính sách giá. Mọi ưu đãi cần theo quy định và quyền phê duyệt của công ty.",
      },
      {
        question:
          "Chỉ số nào đo tốt hơn việc AI giúp sales tiết kiệm thời gian?",
        options: [
          "Số email/tin nhắn bản nháp được tạo và thời gian chỉnh sửa còn lại",
          "Số lần mở ChatGPT trong ngày",
          "Câu trả lời AI dài bao nhiêu",
          "AI dùng từ ngữ có vẻ cao cấp",
        ],
        correctIndex: 0,
        explanation:
          "Đo tác động bằng đầu ra và thời gian tiết kiệm thực tế, không phải số lần dùng công cụ hay độ dài câu trả lời.",
      },
      {
        question:
          "AI tạo chân dung khách hàng mục tiêu rất chi tiết nhưng không dựa trên dữ liệu nào. Bạn nên làm gì?",
        options: [
          "Dùng luôn làm chiến lược bán hàng",
          "Xem là giả thuyết, đối chiếu CRM/phỏng vấn khách rồi mới dùng",
          "Gửi cho khách để xác nhận",
          "Bỏ toàn bộ dữ liệu cũ",
        ],
        correctIndex: 1,
        explanation:
          "Persona do AI tạo khi thiếu dữ liệu chỉ là giả thuyết. Sales cần kiểm chứng bằng dữ liệu thật trước khi ra quyết định.",
      },
    ],
  },

  "ke-toan": {
    id: "ke-toan",
    label: "Nhân viên Kế toán",
    shortLabel: "Kế toán",
    icon: "🧾",
    color: "#2E6B4F",
    modules: [
      {
        id: "ke-toan-m1",
        title: "AI là gì? Nó giúp được gì cho kế toán",
        durationMin: 15,
        level: 1,
        content:
          "AI giúp kế toán tóm tắt báo cáo dài, phân loại hóa đơn, hỏi công thức Excel. Nhưng SỐ LIỆU phải luôn tự đối chiếu — AI có thể 'bịa số'.",
        learnings: [
          "AI bằng ngôn ngữ đời thường",
          "Việc lặp lại AI làm thay được",
          "Giới hạn & trách nhiệm của con người",
        ],
      },
      {
        id: "ke-toan-m2",
        title: "Dùng AI kiểm tra, phân loại & đối chiếu hóa đơn",
        durationMin: 25,
        level: 2,
        attachedFile: {
          name: "bang-chi-phi-6-thang-mau.csv",
          path: "/files/bang-chi-phi-6-thang-mau.csv",
          desc: "Bảng chi phí 6 tháng theo nhóm. Có 1 khoản chi tăng đột biến — nhờ AI phân loại và phát hiện.",
        },
        content:
          "Copy danh sách hóa đơn (đã ẩn danh) vào AI → nhờ phân loại theo nhóm chi phí, phát hiện hóa đơn trùng/lệch.",
        learnings: [
          "Phân loại hóa đơn theo nhóm",
          "Phát hiện trùng/lệch",
          "Quy trình an toàn với dữ liệu",
        ],
      },
      {
        id: "ke-toan-m3",
        title: "Tóm tắt báo cáo tài chính dài thành vài dòng",
        durationMin: 20,
        level: 2,
        content:
          "Báo cáo 20 trang → 5 ý chính cho sếp đọc trong 30 giây. AI tóm tắt được nhưng các CHỈ SỐ cụ thể bạn phải tự verify.",
        learnings: [
          "Tóm tắt 20 trang còn 5 ý",
          "Trích chỉ số quan trọng",
          "Diễn giải cho sếp dễ hiểu",
        ],
      },
      {
        id: "ke-toan-m4",
        title: "Trích xuất số liệu từ chứng từ & PDF bằng AI",
        durationMin: 25,
        level: 2,
        content:
          "ChatPDF + Claude đọc PDF chứng từ → trích thành bảng Excel. Luôn so lại với gốc trước khi nhập sổ.",
        learnings: [
          "Đọc PDF/ảnh chứng từ",
          "Chuyển thành bảng",
          "Kiểm tra lại với gốc",
        ],
      },
      {
        id: "ke-toan-m5",
        title: "Phát hiện số liệu bất thường với AI",
        durationMin: 20,
        level: 3,
        content:
          "Nhờ AI so sánh kỳ này với kỳ trước, chỉ ra điểm lạ (chi phí tăng đột biến, doanh thu lệch nguyên tắc). KHÔNG tin số AI đưa ra mà chưa đối chiếu sổ gốc.",
        learnings: [
          "So sánh kỳ/kỳ",
          "Cảnh báo điểm lạ",
          "Không tin số AI mà chưa đối chiếu",
        ],
      },
      {
        id: "ke-toan-m6",
        title: "Bảo mật dữ liệu tài chính khi dùng AI",
        durationMin: 15,
        level: 3,
        content:
          "KHÔNG đưa lương nhân viên, số tài khoản, MST khách lên ChatGPT công cộng. Hỏi kiến thức chung thì OK. Dữ liệu mật → ẩn danh hoặc dùng bản nội bộ.",
        learnings: [
          "Dữ liệu nào tuyệt đối không đưa lên",
          "Ẩn danh trước khi hỏi",
          "Công cụ nội bộ vs công cộng",
        ],
      },
      {
        id: "ke-toan-m7",
        title: "Đối chiếu công nợ & soạn email nhắc thu hồi bằng AI",
        durationMin: 20,
        level: 2,
        attachedFile: {
          name: "cong-no-phai-thu-mau.csv",
          path: "/files/cong-no-phai-thu-mau.csv",
          desc: "Bảng công nợ phải thu (ẩn tên khách). Mở bằng Excel/Google Sheets. Có 1 dòng số dư không khớp — thử nhờ AI phát hiện.",
        },
        content:
          "Copy bảng công nợ phải thu (đã ẩn tên khách), nhờ AI xếp theo tuổi nợ, đánh dấu khoản quá hạn và soạn sẵn email nhắc với giọng lịch sự. Việc dò tay cả buổi rút còn vài phút. Luôn đối chiếu lại số dư với sổ gốc trước khi gửi.",
        learnings: [
          "Phân nhóm nợ theo tuổi nợ (chưa tới hạn / quá hạn 30-60-90 ngày)",
          "Soạn email nhắc thu hồi đúng giọng từng nhóm khách",
          "Đối chiếu số dư với sổ gốc trước khi gửi",
        ],
      },
      {
        id: "ke-toan-m8",
        title: "Lập báo cáo quản trị nhanh cho sếp bằng AI",
        durationMin: 20,
        level: 3,
        attachedFile: {
          name: "doanh-thu-chi-phi-loi-nhuan-mau.csv",
          path: "/files/doanh-thu-chi-phi-loi-nhuan-mau.csv",
          desc: "Số liệu doanh thu–chi phí–lợi nhuận 6 tháng. Có 1 tháng lỗ bất thường — nhờ AI chỉ ra nguyên nhân.",
        },
        content:
          "Từ số liệu thô (doanh thu, chi phí, lợi nhuận theo tháng), nhờ AI viết bản tóm tắt quản trị 5 ý cho sếp: xu hướng, điểm bất thường, rủi ro, đề xuất. AI dựng khung và câu chữ, bạn kiểm số liệu. Tuyệt đối không để AI tự bịa con số — yêu cầu nó chỉ dùng dữ liệu bạn cung cấp.",
        learnings: [
          "Biến số liệu khô thành bản tóm tắt sếp đọc hiểu ngay",
          "Yêu cầu AI chỉ dùng số bạn đưa, không tự bịa",
          "Kiểm chứng mọi con số trước khi trình",
        ],
      },
    ],
    starterKit: {
      prompts: [
        {
          title: "Tóm tắt báo cáo tài chính",
          prompt:
            "Tóm tắt báo cáo sau thành 5 ý chính cho CEO: (1) tổng doanh thu, (2) chi phí lớn nhất, (3) lợi nhuận, (4) điểm bất thường, (5) đề xuất. [DÁN BÁO CÁO]",
        },
        {
          title: "Công thức Excel khó",
          prompt:
            "Viết công thức Excel để [MÔ TẢ YÊU CẦU]. Giải thích từng phần. Cho VÍ DỤ với dữ liệu mẫu.",
        },
        {
          title: "Phân loại chi phí",
          prompt:
            "Phân loại các khoản chi sau theo nhóm: chi phí cố định/biến đổi/đầu tư. Cho dạng bảng. [DÁN DANH SÁCH]",
        },
      ],
      tools: [
        {
          name: "ChatGPT",
          color: "#10A37F",
          desc: "Hỏi đáp nghiệp vụ, công thức Excel.",
          useFor: "Hỏi cách viết công thức Excel phức tạp",
        },
        {
          name: "Claude",
          color: "#D97757",
          desc: "Đọc tài liệu & báo cáo dài.",
          useFor: "Tóm tắt báo cáo tài chính, đọc hợp đồng",
        },
        {
          name: "Copilot",
          color: "#0F6CBD",
          desc: "Phân tích bảng tính ngay trong Excel.",
          useFor: "Tạo công thức & biểu đồ từ câu lệnh",
        },
        {
          name: "ChatPDF",
          color: "#E8533F",
          desc: "Hỏi đáp trực tiếp trên file PDF.",
          useFor: "Trích số liệu từ chứng từ PDF",
        },
      ],
    },
    quiz: [
      {
        question:
          "Dữ liệu nào bạn TUYỆT ĐỐI không nên dán vào công cụ AI công cộng?",
        options: [
          "Định nghĩa «khấu hao là gì»",
          "Bảng lương chi tiết kèm tên & số tài khoản nhân viên",
          "Câu hỏi về cách dùng hàm Excel",
          "Câu hỏi về chuẩn mực kế toán chung",
        ],
        correctIndex: 1,
        explanation:
          "Thông tin nhạy cảm (lương, tài khoản, MST khách) không nên đưa lên công cụ công cộng. Hỏi kiến thức chung thì an toàn.",
      },
      {
        question: "AI có thể giúp kế toán việc nào?",
        options: [
          "Tự động nộp thuế thay bạn",
          "Tóm tắt nhanh báo cáo tài chính 20 trang để bạn nắm ý chính",
          "Đảm bảo sổ sách không bao giờ sai",
          "Thay kế toán trưởng ký duyệt",
        ],
        correctIndex: 1,
        explanation:
          "AI giỏi tóm tắt, phân loại, trích xuất — nhưng con người vẫn phải kiểm tra và chịu trách nhiệm cuối cùng.",
      },
      {
        question:
          "AI trả lời một con số tài chính rất cụ thể mà bạn không chắc đúng. Bạn nên?",
        options: [
          "Tin ngay vì AI thông minh",
          "Đối chiếu lại với chứng từ/sổ gốc trước khi dùng",
          "Gửi luôn cho sếp",
          "Bỏ qua hoàn toàn AI",
        ],
        correctIndex: 1,
        explanation:
          "AI có thể «bịa số» (ảo giác). Luôn đối chiếu số liệu với nguồn gốc trước khi sử dụng.",
      },
      {
        question:
          "Bạn muốn AI phân loại danh sách chi phí. Cách chuẩn bị dữ liệu nào phù hợp?",
        options: [
          "Ẩn tên nhà cung cấp nhạy cảm, giữ mô tả khoản chi, ngày, nhóm dự kiến và số tiền cần kiểm tra",
          "Gửi toàn bộ file kế toán kèm tài khoản ngân hàng",
          "Chỉ gửi tổng tiền và yêu cầu AI đoán nhóm chi phí",
          "Yêu cầu AI tự tạo chứng từ còn thiếu",
        ],
        correctIndex: 0,
        explanation:
          "AI cần dữ liệu đủ ngữ cảnh để phân loại, nhưng thông tin định danh, tài khoản và chứng từ nhạy cảm phải được bảo vệ.",
      },
      {
        question:
          "Khi nhờ AI giải thích công thức Excel dài, yêu cầu nào giúp kiểm soát lỗi tốt hơn?",
        options: [
          "Giải thích từng phần, nêu giả định và tạo ví dụ nhỏ để kiểm tra kết quả",
          "Chỉ trả lời công thức cuối cùng",
          "Tự sửa mọi số liệu trong file",
          "Bỏ qua trường hợp dữ liệu trống",
        ],
        correctIndex: 0,
        explanation:
          "Giải thích từng phần và kiểm bằng ví dụ nhỏ giúp kế toán phát hiện lỗi logic trước khi áp dụng vào file thật.",
      },
      {
        question:
          "AI phát hiện một khoản chi tăng đột biến so với tháng trước. Bước tiếp theo nên là gì?",
        options: [
          "Kết luận ngay là gian lận",
          "Kiểm tra chứng từ, người duyệt và bối cảnh phát sinh trước khi kết luận",
          "Xóa dòng đó khỏi báo cáo",
          "Đăng lên nhóm công ty để hỏi",
        ],
        correctIndex: 1,
        explanation:
          "Bất thường chỉ là tín hiệu cần kiểm tra. Kết luận nghiệp vụ phải dựa trên chứng từ và quy trình phê duyệt.",
      },
      {
        question:
          "Bạn muốn AI soạn email nhắc công nợ. Điều nào cần tránh?",
        options: [
          "Dùng giọng lịch sự và nêu hạn thanh toán rõ",
          "Đưa sai số dư hoặc đe dọa pháp lý khi chưa được duyệt",
          "Kiểm tra lại số tiền trước khi gửi",
          "Ẩn thông tin khách khi hỏi AI công cộng",
        ],
        correctIndex: 1,
        explanation:
          "Email công nợ liên quan số tiền và quan hệ khách hàng. Không dùng số sai hoặc cam kết pháp lý khi chưa được duyệt.",
      },
      {
        question:
          "Khi dùng AI tóm tắt báo cáo tài chính cho sếp, đầu ra nào hữu ích nhất?",
        options: [
          "5 ý chính: doanh thu, chi phí lớn, lợi nhuận, bất thường và việc cần quyết định",
          "Một đoạn văn thật dài không có số liệu",
          "Các nhận định chắc chắn dù thiếu dữ liệu",
          "Chỉ viết lại tiêu đề báo cáo",
        ],
        correctIndex: 0,
        explanation:
          "Báo cáo quản trị cần ngắn, có cấu trúc và chỉ rõ quyết định cần đưa ra. Số liệu vẫn phải được kế toán kiểm chứng.",
      },
      {
        question:
          "Câu nào mô tả đúng vai trò của AI trong kiểm tra chứng từ?",
        options: [
          "AI gợi ý điểm cần xem lại, còn người có chuyên môn đối chiếu chứng từ gốc",
          "AI thay thế hoàn toàn kiểm soát nội bộ",
          "AI được tự tạo hóa đơn bổ sung",
          "AI quyết định khoản chi hợp lệ cuối cùng",
        ],
        correctIndex: 0,
        explanation:
          "AI hỗ trợ đọc, phân loại và cảnh báo. Trách nhiệm xác nhận chứng từ và tính hợp lệ vẫn thuộc quy trình kế toán.",
      },
      {
        question:
          "Nếu công ty có công cụ AI nội bộ được phê duyệt, lợi ích chính so với công cụ công cộng là gì?",
        options: [
          "Có thể có quy định bảo mật, kiểm soát quyền truy cập và lưu trữ phù hợp hơn",
          "AI sẽ luôn đúng 100%",
          "Không cần kiểm tra số liệu nữa",
          "Có thể chia sẻ mọi dữ liệu cho bất kỳ ai",
        ],
        correctIndex: 0,
        explanation:
          "Công cụ nội bộ có thể giảm rủi ro dữ liệu nếu được cấu hình đúng, nhưng vẫn cần kiểm tra kết quả và tuân thủ quy trình.",
      },
    ],
  },

  marketing: {
    id: "marketing",
    label: "Nhân viên Marketing",
    shortLabel: "Marketing",
    icon: "📣",
    color: "#C8923B",
    modules: [
      {
        id: "marketing-m1",
        title: "AI là gì? Nó giúp được gì cho marketing",
        durationMin: 15,
        level: 1,
        content:
          "AI là người viết nháp giỏi — bạn là biên tập viên. Tạo 20 ý tưởng trong 1 phút, viết nháp đa kênh, sinh ảnh minh hoạ. Nhưng giọng văn cuối phải do bạn duyệt.",
        learnings: [
          "AI bằng ngôn ngữ đời thường",
          "AI làm nháp — bạn làm biên tập",
          "Việc AI hỗ trợ tốt nhất",
        ],
      },
      {
        id: "marketing-m2",
        title: "Viết content đa kênh (FB, email, web) với AI",
        durationMin: 25,
        level: 1,
        content:
          "Một ý tưởng → nhiều định dạng: post FB ngắn, email dài, bài blog SEO, caption Instagram. Đưa mẫu giọng văn brand vào prompt để giữ tone.",
        learnings: [
          "Một ý tưởng → nhiều định dạng",
          "Giữ giọng thương hiệu",
          "Prompt cho từng kênh",
        ],
      },
      {
        id: "marketing-m3",
        title: "Tạo ý tưởng & ảnh visual bằng AI",
        durationMin: 20,
        level: 2,
        tool: "chatgpt-image",
        toolReason:
          "Bài này cần tạo ảnh minh hoạ — dùng ChatGPT có DALL-E tích hợp sẵn để có kết quả tốt nhất",
        content:
          "Brainstorm 20 ý trong 1 phút với ChatGPT. Tạo ảnh minh hoạ với Midjourney/Canva AI. Mô tả ảnh càng chi tiết → AI vẽ càng đúng.",
        learnings: [
          "Brainstorm 20 ý trong 1 phút",
          "Tạo ảnh minh hoạ",
          "Mô tả ảnh cho AI vẽ",
        ],
      },
      {
        id: "marketing-m4",
        title: "Lên lịch & kế hoạch nội dung 30 ngày với AI",
        durationMin: 20,
        level: 2,
        content:
          "Khung content tháng theo 3 trụ cột (educate/inspire/sell). AI giúp phân bổ + tái sử dụng nội dung cũ thành format mới.",
        learnings: [
          "Khung content tháng",
          "Phân bổ theo trụ cột",
          "Tái sử dụng nội dung cũ",
        ],
      },
      {
        id: "marketing-m5",
        title: "Đọc số & phân tích hiệu quả chiến dịch",
        durationMin: 25,
        level: 3,
        attachedFile: {
          name: "so-lieu-chien-dich-mau.csv",
          path: "/files/so-lieu-chien-dich-mau.csv",
          desc: "Số liệu 5 chiến dịch (impression/click/chi phí/đơn). Có 1 chiến dịch CTR cực thấp — nhờ AI chỉ ra và đề xuất tối ưu.",
        },
        content:
          "Copy báo cáo Meta Ads/GA4 → nhờ AI giải thích. Đề xuất tối ưu dựa trên CPM, CTR, conversion. Nhưng QUYẾT ĐỊNH ngân sách vẫn do bạn.",
        learnings: [
          "Hiểu chỉ số cơ bản",
          "Nhờ AI giải thích báo cáo",
          "Đề xuất tối ưu",
        ],
      },
      {
        id: "marketing-m6",
        title: "Đạo đức nội dung AI & tránh 'giọng văn AI'",
        durationMin: 15,
        level: 3,
        content:
          "Content AI thường nhạt: 'Hãy cùng khám phá', 'Trong thời đại số ngày nay'. Cần biên tập lại có cảm xúc, ví dụ cụ thể, ngôn ngữ thương hiệu. Minh bạch khi dùng AI.",
        learnings: [
          "Nhận ra văn AI nhạt",
          "Biên tập cho có cảm xúc",
          "Minh bạch khi dùng AI",
        ],
      },
    ],
    starterKit: {
      prompts: [
        {
          title: "20 tiêu đề Facebook",
          prompt:
            "Viết 20 tiêu đề Facebook cho [SẢN PHẨM], đối tượng [TUỔI + ĐẶC ĐIỂM], giọng [TONE], mỗi tiêu đề ≤12 từ. Đa dạng góc nhìn (hài, sốc, lợi ích, FOMO).",
        },
        {
          title: "Caption đa kênh từ 1 ý",
          prompt:
            "Từ ý: [Ý CHÍNH]. Viết 4 phiên bản: (1) Post FB 80 từ, (2) Caption IG 30 từ + 5 hashtag, (3) Email subject + 100 từ preview, (4) Hook TikTok 3 giây đầu.",
        },
        {
          title: "Phân tích chiến dịch",
          prompt:
            "Đọc số liệu chiến dịch sau, chỉ ra: (1) chỉ số tốt, (2) chỉ số kém, (3) 3 đề xuất tối ưu cụ thể. [DÁN SỐ LIỆU]",
        },
      ],
      tools: [
        {
          name: "ChatGPT",
          color: "#10A37F",
          desc: "Ý tưởng, tiêu đề, bài nháp.",
          useFor: "Tạo 20 ý tưởng bài viết trong 1 phút",
        },
        {
          name: "Claude",
          color: "#D97757",
          desc: "Viết bài dài có chiều sâu, đúng giọng brand.",
          useFor: "Viết blog & chuỗi email",
        },
        {
          name: "Canva AI",
          color: "#7D2AE8",
          desc: "Thiết kế & ấn phẩm nhanh.",
          useFor: "Tạo ảnh post & banner",
        },
        {
          name: "Gemini",
          color: "#1A73E8",
          desc: "Tìm kiếm + sáng tạo, đọc xu hướng.",
          useFor: "Nghiên cứu xu hướng & đối thủ",
        },
      ],
    },
    quiz: [
      {
        question:
          "Làm sao để content AI viết không bị «giọng văn AI» nhạt nhẽo?",
        options: [
          "Cứ đăng nguyên văn AI viết",
          "Cho AI ví dụ giọng văn thương hiệu + tự biên tập lại cho có cảm xúc",
          "Viết prompt 1 chữ «content»",
          "Dịch qua lại nhiều thứ tiếng",
        ],
        correctIndex: 1,
        explanation:
          "Hãy đưa AI mẫu giọng văn của thương hiệu và luôn biên tập lại — AI là người viết nháp, bạn là biên tập viên.",
      },
      {
        question: "AI hữu ích nhất cho marketing ở khâu nào?",
        options: [
          "Thay bạn hiểu sâu insight khách hàng mà không cần dữ liệu",
          "Tạo nhanh nhiều phương án tiêu đề, ý tưởng, bài nháp để chọn lọc",
          "Đảm bảo bài viral",
          "Tự chạy quảng cáo không cần người",
        ],
        correctIndex: 1,
        explanation:
          "AI giúp tạo nhiều phương án thật nhanh để bạn chọn lọc — sáng tạo và phán đoán vẫn cần con người.",
      },
      {
        question:
          "Bạn cần 10 tiêu đề cho bài về đệm ngủ cao cấp. Prompt nào tốt hơn?",
        options: [
          "«Cho tiêu đề»",
          "«Viết 10 tiêu đề Facebook cho đệm cao cấp nhập khẩu, đối tượng 35–55 tuổi quan tâm giấc ngủ, giọng sang trọng mà gần gũi, mỗi tiêu đề ≤12 từ»",
          "«Đệm»",
          "«Hay vào»",
        ],
        correctIndex: 1,
        explanation:
          "Cụ thể về đối tượng, sản phẩm, giọng văn, số lượng, độ dài → kết quả sát hơn nhiều.",
      },
      {
        question:
          "Bạn muốn AI lên lịch nội dung 30 ngày. Dữ kiện nào quan trọng nhất?",
        options: [
          "Mục tiêu chiến dịch, chân dung khách hàng, kênh, trụ cột nội dung và ngày quan trọng",
          "Chỉ yêu cầu 'làm content tháng này'",
          "Bắt AI tự đoán toàn bộ sản phẩm",
          "Không cần lịch vì AI sẽ tự tối ưu",
        ],
        correctIndex: 0,
        explanation:
          "Content calendar cần bối cảnh rõ về mục tiêu, audience, kênh và mốc thời gian để tránh lịch chung chung.",
      },
      {
        question:
          "Khi dùng AI tạo visual brief cho designer, đầu ra nào dễ dùng nhất?",
        options: [
          "Mô tả mục tiêu ảnh, đối tượng, bố cục, màu, thông điệp chính và điều cần tránh",
          "Vẽ đẹp lên",
          "Sao chép y hệt quảng cáo đối thủ",
          "Không cần nói kích thước/kênh đăng",
        ],
        correctIndex: 0,
        explanation:
          "Visual brief tốt giúp AI/designer hiểu mục tiêu và ràng buộc sáng tạo. Không nên sao chép tài sản của đối thủ.",
      },
      {
        question:
          "AI gợi ý một insight khách hàng nghe rất hay nhưng chưa có dữ liệu. Bạn nên làm gì?",
        options: [
          "Dùng ngay làm thông điệp quảng cáo chính",
          "Xem là giả thuyết và kiểm chứng bằng survey, CRM hoặc dữ liệu chiến dịch",
          "Phóng đại cho hấp dẫn",
          "Xóa dữ liệu cũ vì AI đã phân tích",
        ],
        correctIndex: 1,
        explanation:
          "Insight marketing cần dữ liệu thật. AI hữu ích để tạo giả thuyết, không thay thế nghiên cứu khách hàng.",
      },
      {
        question:
          "Khi nhờ AI phân tích chỉ số quảng cáo, yêu cầu nào giảm hiểu sai?",
        options: [
          "Nêu mục tiêu chiến dịch, định nghĩa chỉ số và yêu cầu AI chỉ kết luận từ bảng số liệu đã cung cấp",
          "Chỉ dán bảng rồi hỏi 'tốt không'",
          "Yêu cầu AI tự bịa benchmark ngành",
          "Bỏ qua ngân sách và thời gian chạy",
        ],
        correctIndex: 0,
        explanation:
          "AI cần hiểu mục tiêu và phạm vi dữ liệu. Benchmark hoặc kết luận ngoài dữ liệu phải được kiểm chứng nguồn.",
      },
      {
        question:
          "Việc nào nên có người duyệt trước khi dùng nội dung AI tạo ra?",
        options: [
          "Thông điệp thương hiệu, claim sản phẩm, số liệu và nội dung nhạy cảm",
          "Tên file nháp nội bộ",
          "Danh sách ý tưởng chưa xuất bản",
          "Gợi ý cấu trúc checklist cá nhân",
        ],
        correctIndex: 0,
        explanation:
          "Nội dung ra ngoài thị trường ảnh hưởng thương hiệu và pháp lý, nên marketer phải duyệt claim, số liệu và giọng thương hiệu.",
      },
      {
        question:
          "Bạn muốn tái sử dụng một bài blog thành nhiều kênh. Prompt nào đúng hướng?",
        options: [
          "Chuyển bài này thành post Facebook, email, caption LinkedIn và script video ngắn, giữ thông điệp chính và CTA",
          "Viết lại tùy ý, càng khác càng tốt",
          "Xóa thông điệp chính",
          "Tự thêm ưu đãi chưa có",
        ],
        correctIndex: 0,
        explanation:
          "AI rất hợp để repurpose nội dung khi bạn giữ rõ thông điệp, kênh, định dạng và CTA. Không để AI tự thêm ưu đãi.",
      },
      {
        question:
          "Dấu hiệu nào cho thấy bản nháp AI cần biên tập lại trước khi đăng?",
        options: [
          "Dùng nhiều câu sáo rỗng, thiếu ví dụ thật và không giống giọng thương hiệu",
          "Có bố cục rõ",
          "Có nhiều phương án tiêu đề",
          "Có CTA đúng mục tiêu",
        ],
        correctIndex: 0,
        explanation:
          "Bản nháp AI thường cần con người thêm trải nghiệm thật, dữ kiện cụ thể và giọng thương hiệu để tránh cảm giác chung chung.",
      },
    ],
  },

  "van-hanh": {
    id: "van-hanh",
    label: "Nhân viên Hành chính / Nhân sự (HR)",
    shortLabel: "Hành chính / HR",
    icon: "🗂️",
    color: "#3C6E8F",
    modules: [
      {
        id: "van-hanh-m1",
        title: "AI là gì? Nó giúp được gì cho hành chính & HR",
        durationMin: 15,
        level: 1,
        isFoundation: true,
        skills: ["nen-tang-ai"],
        content:
          "AI giúp tự động hóa việc lặp lại: email thông báo, tóm tắt biên bản, soạn quy trình, sàng lọc CV. Tiết kiệm 2-3 giờ/ngày cho việc cần phán đoán.",
        learnings: [
          "AI bằng ngôn ngữ đời thường",
          "Tự động hoá việc lặp lại trong hành chính",
          "Khi nào cần con người quyết",
        ],
      },
      {
        id: "van-hanh-m2",
        title: "Viết prompt tốt & tự động hóa việc lặp lại",
        durationMin: 25,
        level: 1,
        isFoundation: true,
        skills: ["viet-prompt"],
        content:
          "Một prompt tốt = vai trò + bối cảnh + yêu cầu. Nhận diện việc lặp lại trong ngày → tạo prompt template tái dùng. VD: 'Soạn email từ chối ứng viên cho vị trí [VỊ TRÍ], giọng tôn trọng, gợi ý cơ hội khác'.",
        practicePrompt:
          "Bạn là nhân viên hành chính. Viết prompt mẫu để soạn nhanh email thông báo nội bộ cho [SỰ KIỆN], giọng lịch sự, ≤100 từ. Chừa chỗ [NGẶC] cho phần thay đổi.",
        learnings: [
          "Cấu trúc prompt vai trò + bối cảnh + yêu cầu",
          "Mẫu prompt tái dùng cho việc lặp lại",
          "Giảm thời gian thủ công",
        ],
      },
      {
        id: "van-hanh-m3",
        title: "Tóm tắt & soạn email/biên bản công việc",
        durationMin: 20,
        level: 2,
        skills: ["tom-tat-tai-lieu", "email-noi-bo"],
        attachedFile: {
          name: "bien-ban-hop-mau.txt",
          path: "/files/bien-ban-hop-mau.txt",
          desc: "Biên bản họp mẫu. Có 1 con số ngân sách CHƯA được duyệt — đừng để AI ghi nhầm thành đã chốt.",
        },
        content:
          "Biên bản họp 1 giờ → 5 ý chính + đầu việc + deadline. Email mẫu nhiều tình huống. Tiết kiệm 30 phút/họp.",
        learnings: [
          "Tóm tắt biên bản họp",
          "Soạn email theo mẫu",
          "Trích đầu việc & deadline",
        ],
      },
      {
        id: "van-hanh-m4",
        title: "Sắp xếp & tra cứu dữ liệu nhanh bằng AI",
        durationMin: 20,
        level: 2,
        content:
          "Upload tài liệu SOP → AI giúp tra cứu nhanh. Tạo checklist tự động cho quy trình mới. Phân loại dữ liệu theo nhóm.",
        learnings: [
          "Phân loại dữ liệu",
          "Hỏi đáp trên tài liệu",
          "Tạo checklist tự động",
        ],
      },
      {
        id: "van-hanh-m5",
        title: "Lập kế hoạch & điều phối lịch với AI",
        durationMin: 20,
        level: 3,
        content:
          "AI giúp lập kế hoạch tuần dựa trên priority. Phân việc theo capacity team. Nhắc việc + theo dõi deadline.",
        learnings: [
          "Lập kế hoạch tuần",
          "Phân việc hợp lý",
          "Nhắc việc & theo dõi",
        ],
      },
      {
        id: "van-hanh-m6",
        title: "Rủi ro & cách kiểm soát khi dùng AI",
        durationMin: 15,
        level: 3,
        isFoundation: true,
        skills: ["an-toan-du-lieu"],
        content:
          "Hợp đồng, dữ liệu nhân viên mật KHÔNG đưa lên công cụ công cộng. Luôn đọc lại kết quả AI. Có quy tắc dùng AI an toàn cho team.",
        learnings: [
          "Dữ liệu mật & hợp đồng",
          "Kiểm tra lại kết quả AI",
          "Quy tắc dùng AI an toàn",
        ],
      },
      {
        id: "van-hanh-m7",
        title: "Soạn quyết định & thông báo nội bộ bằng AI",
        durationMin: 20,
        level: 2,
        skills: ["van-ban-hanh-chinh"],
        rubric: [
          { criteria: "Đúng thể thức văn bản hành chính", maxPoints: 20 },
          { criteria: "Đủ thông tin bắt buộc (số/ký hiệu, căn cứ, ngày)", maxPoints: 20 },
          { criteria: "Nội dung chính xác theo yêu cầu đề bài", maxPoints: 25 },
          { criteria: "Ngôn ngữ trang trọng, chuyên nghiệp", maxPoints: 15 },
          { criteria: "Đã điền/chỉnh chỗ trống thay vì để nguyên mẫu", maxPoints: 10 },
          { criteria: "Kết quả có thể ban hành được ngay", maxPoints: 10 },
        ],
        practicePrompt:
          "Bạn là nhân viên hành chính. Soạn một QUYẾT ĐỊNH bổ nhiệm [CHỨC DANH] cho [VỊ TRÍ], đúng thể thức văn bản hành chính Việt Nam (Quốc hiệu, số/ký hiệu, căn cứ, điều khoản, nơi nhận). Chừa [NGẶC] cho phần điền tay.",
        content:
          "AI dựng nhanh khung văn bản hành chính đúng thể thức: quyết định, thông báo, công văn. Bạn chỉ điền số liệu và rà thể thức. Lưu ý: tên người, số quyết định thật phải tự điền, không để AI bịa.",
        learnings: [
          "Khung văn bản đúng thể thức hành chính VN",
          "Điền chỗ trống & rà lại trước khi ban hành",
          "Không để AI bịa số/tên thật",
        ],
      },
      {
        id: "van-hanh-m8",
        title: "Sàng lọc & tóm tắt CV tuyển dụng bằng AI",
        durationMin: 25,
        level: 2,
        skills: ["loc-cv"],
        attachedFile: {
          name: "cv-ung-vien-mau.txt",
          path: "/files/cv-ung-vien-mau.txt",
          desc: "5 CV ứng viên (ẩn danh). Có ứng viên nhảy việc nhiều và CV mô tả mơ hồ — thử nhờ AI chấm mức khớp.",
        },
        rubric: [
          { criteria: "Chấm mức khớp JD rõ ràng (thang điểm)", maxPoints: 25 },
          { criteria: "Nêu điểm mạnh & điểm thiếu của ứng viên", maxPoints: 20 },
          { criteria: "Gợi ý câu hỏi phỏng vấn sát vị trí", maxPoints: 20 },
          { criteria: "Đã ẩn danh dữ liệu ứng viên", maxPoints: 20 },
          { criteria: "Kết quả trình bày dạng bảng dễ dùng", maxPoints: 15 },
        ],
        practicePrompt:
          "Đây là JD vị trí [VỊ TRÍ] và 5 CV (đã ẩn tên, SĐT). Hãy chấm mỗi CV theo mức độ khớp JD (thang 1-5), nêu 1 điểm mạnh + 1 điểm thiếu, và gợi ý câu hỏi phỏng vấn. Trả về dạng bảng.",
        content:
          "Dán JD + nhiều CV (đã ẩn thông tin cá nhân) → AI xếp hạng mức khớp, tóm tắt điểm mạnh/yếu, gợi ý câu hỏi phỏng vấn. Việc đọc cả xấp CV rút còn vài phút. TUYỆT ĐỐI ẩn danh dữ liệu ứng viên trước khi đưa lên công cụ công cộng.",
        learnings: [
          "Chấm CV theo mức khớp JD",
          "Ẩn danh dữ liệu ứng viên trước khi hỏi AI",
          "Gợi ý câu hỏi phỏng vấn sát vị trí",
        ],
      },
      {
        id: "van-hanh-m9",
        title: "Viết email nội bộ & truyền thông HR bằng AI",
        durationMin: 15,
        level: 1,
        skills: ["email-noi-bo"],
        practicePrompt:
          "Viết email nội bộ thông báo [CHÍNH SÁCH/SỰ KIỆN HR] gửi toàn công ty, giọng thân thiện nhưng chuyên nghiệp, ≤150 từ, có phần hành động cần làm & hạn chót.",
        content:
          "AI giúp HR viết email nội bộ rõ ràng, đúng giọng công ty: thông báo chính sách, nhắc nộp hồ sơ, mời sự kiện. Một ý → nhiều bản (trang trọng/thân thiện) để chọn.",
        learnings: [
          "Email nội bộ rõ ý, đúng giọng công ty",
          "Nêu rõ hành động & hạn chót",
          "Tạo nhiều phiên bản giọng để chọn",
        ],
      },
      {
        id: "van-hanh-m10",
        title: "Hỗ trợ chấm công & nghỉ phép bằng AI",
        durationMin: 20,
        level: 3,
        skills: ["cham-cong-nghi-phep"],
        practicePrompt:
          "Đây là bảng chấm công tháng (đã ẩn tên). Hãy phát hiện ngày công bất thường (đi muộn, thiếu công), tính số ngày phép còn lại theo quy định [SỐ NGÀY/NĂM], và tóm tắt thành bảng cho HR rà soát.",
        content:
          "Dán bảng chấm công (ẩn tên) → AI phát hiện bất thường, tính phép tồn, dựng bản tóm tắt. AI hỗ trợ rà soát, còn con số cuối cùng HR phải đối chiếu hệ thống chấm công gốc.",
        learnings: [
          "Phát hiện ngày công bất thường",
          "Tính phép tồn theo quy định công ty",
          "Đối chiếu lại với hệ thống gốc trước khi chốt",
        ],
      },
      {
        id: "van-hanh-m11",
        title: "Soạn nháp chính sách/nội quy & rà rủi ro pháp lý",
        durationMin: 25,
        level: 3,
        skills: ["danh-gia-chinh-sach"],
        practicePrompt:
          "Soạn nháp quy định làm việc từ xa cho công ty 50 người: phạm vi, điều kiện, trách nhiệm, ≤1 trang. Đánh dấu rõ chỗ cần pháp chế rà.",
        content:
          "AI soạn nháp chính sách/nội quy, khung tiêu chí đánh giá KPI, tổng hợp feedback. Cảnh báo: chính sách phải đúng Luật Lao động — AI chỉ nháp, người + pháp chế rà trước khi ban hành.",
        learnings: [
          "Soạn nháp chính sách/nội quy",
          "Khung tiêu chí đánh giá",
          "Rà rủi ro pháp lý",
        ],
        attachedFile: {
          name: "noi-quy-cong-ty-mau.txt",
          path: "/files/noi-quy-cong-ty-mau.txt",
          desc: "Bản nội quy công ty mẫu. Có 1 điều khoản phạt tiền nhân viên — trái Luật Lao động Việt Nam; học viên cần phát hiện và gắn cờ.",
        },
        rubric: [
          { criteria: "Đúng cấu trúc chính sách", maxPoints: 25 },
          { criteria: "Nội dung hợp lý", maxPoints: 25 },
          { criteria: "Phát hiện điều khoản trái luật", maxPoints: 30 },
          { criteria: "Đánh dấu chỗ cần pháp chế", maxPoints: 20 },
        ],
      },
      {
        id: "van-hanh-m12",
        title: "Phân tích dữ liệu nhân sự & ra quyết định",
        durationMin: 25,
        level: 3,
        skills: ["phan-tich-du-lieu-ns"],
        practicePrompt:
          "Từ bảng dữ liệu nhân sự đính kèm, chỉ ra 3 điểm bất thường (đi muộn nhiều, nghỉ bất thường, OT cao) và đề xuất hành động cho mỗi điểm.",
        content:
          "AI hỗ trợ đọc bảng chấm công, turnover, chi phí nhân sự → tìm bất thường, tóm tắt cho ban giám đốc. AI đọc số, con người diễn giải bối cảnh và quyết định.",
        learnings: [
          "Đọc & tóm tắt bảng số liệu",
          "Phát hiện bất thường",
          "Đề xuất hành động dựa trên dữ liệu",
        ],
        attachedFile: {
          name: "du-lieu-nhan-su-mau.csv",
          path: "/files/du-lieu-nhan-su-mau.csv",
          desc: "Dữ liệu nhân sự theo phòng (headcount, turnover, đi muộn, OT) — đã ẩn tên. Có 1 con số bất thường có thể do lỗi nhập liệu; đừng kết luận vội, nêu là điểm cần xác minh.",
        },
        rubric: [
          { criteria: "Đọc đúng số liệu", maxPoints: 25 },
          { criteria: "Tìm đúng bất thường", maxPoints: 30 },
          { criteria: "Không kết luận vội/bịa", maxPoints: 25 },
          { criteria: "Đề xuất hành động hợp lý", maxPoints: 20 },
        ],
      },
      {
        id: "van-hanh-m13",
        title: "C&B & kiểm tra bảng lương an toàn",
        durationMin: 25,
        level: 3,
        skills: ["cb-tinh-luong", "an-toan-du-lieu"],
        practicePrompt:
          "Kiểm tra bảng lương đính kèm: công thức 'thực nhận' có nhất quán với (gross − khấu trừ) không? Chỉ ra dòng sai. Dữ liệu đã ẩn tên.",
        content:
          "AI giúp giải thích cấu trúc lương, kiểm tra công thức, phát hiện sai sót tính toán. ĐẶC BIỆT QUAN TRỌNG: lương là dữ liệu nhạy cảm — luôn ẩn danh (bỏ tên, mã NV) trước khi đưa lên công cụ AI công cộng.",
        learnings: [
          "Hiểu cấu trúc lương gross/net",
          "Kiểm tra công thức & sai sót",
          "An toàn dữ liệu lương",
        ],
        attachedFile: {
          name: "bang-luong-mau.csv",
          path: "/files/bang-luong-mau.csv",
          desc: "Bảng lương mẫu (đã ẩn tên, chỉ còn mã ẩn danh). Có 1 dòng sai: thực nhận ≠ gross − khấu trừ. Học viên cần tìm ra.",
        },
        rubric: [
          { criteria: "Tìm đúng dòng sai", maxPoints: 30 },
          { criteria: "Giải thích công thức đúng", maxPoints: 25 },
          { criteria: "Cảnh báo ẩn danh dữ liệu lương", maxPoints: 25 },
          { criteria: "Không bịa số", maxPoints: 20 },
        ],
      },
      {
        id: "van-hanh-m14",
        title: "Thiết kế đào tạo & L&D với mục tiêu SMART",
        durationMin: 20,
        level: 2,
        skills: ["dao-tao-ld"],
        practicePrompt:
          "Thiết kế outline buổi đào tạo 2 giờ về 'An toàn lao động' cho nhân viên mới: mục tiêu (đo được), nội dung từng phần, 3 câu quiz cuối buổi.",
        content:
          "AI giúp soạn outline khóa đào tạo, tạo quiz kiểm tra, lộ trình onboarding kiến thức, tài liệu hướng dẫn. Mục tiêu đào tạo cần đo được (SMART).",
        learnings: [
          "Soạn outline đào tạo",
          "Tạo quiz/đánh giá",
          "Đặt mục tiêu học tập đo được",
        ],
        attachedFile: {
          name: "ke-hoach-dao-tao-mau.txt",
          path: "/files/ke-hoach-dao-tao-mau.txt",
          desc: "Brief kế hoạch đào tạo mẫu. Mục tiêu viết mơ hồ ('giúp nhân viên hiểu hơn') — học viên cần biến thành mục tiêu SMART đo được.",
        },
        rubric: [
          { criteria: "Outline rõ, logic", maxPoints: 30 },
          { criteria: "Mục tiêu SMART đo được", maxPoints: 30 },
          { criteria: "Quiz bám nội dung", maxPoints: 25 },
          { criteria: "Phù hợp đối tượng", maxPoints: 15 },
        ],
      },
    ],
    starterKit: {
      prompts: [
        {
          title: "Tóm tắt biên bản họp",
          prompt:
            "Tóm tắt biên bản sau thành: (1) chủ đề chính, (2) quyết định đã chốt, (3) đầu việc + người chịu trách nhiệm + deadline, (4) việc còn vướng. [DÁN BIÊN BẢN]",
        },
        {
          title: "Email từ chối lịch sự",
          prompt:
            "Soạn email từ chối [DỊCH VỤ/ỨNG VIÊN/ĐỀ XUẤT] một cách lịch sự, tôn trọng, ≤80 từ. Có gợi ý hướng khác nếu phù hợp.",
        },
        {
          title: "Checklist quy trình mới",
          prompt:
            "Tạo checklist chi tiết cho quy trình [MÔ TẢ]. Có bước, người phụ trách, thời gian dự kiến. Dạng bảng.",
        },
      ],
      tools: [
        {
          name: "ChatGPT",
          color: "#10A37F",
          desc: "Soạn email, quy trình, checklist.",
          useFor: "Soạn quy trình & email mẫu",
        },
        {
          name: "Claude",
          color: "#D97757",
          desc: "Tóm tắt tài liệu, biên bản dài.",
          useFor: "Tóm tắt biên bản họp, đọc SOP",
        },
        {
          name: "Copilot",
          color: "#0F6CBD",
          desc: "Hỗ trợ ngay trong Word/Excel/Outlook.",
          useFor: "Soạn & tóm tắt trong bộ Office",
        },
        {
          name: "Zapier",
          color: "#FF4F00",
          desc: "Tự động nối các phần mềm với nhau.",
          useFor: "Tự chuyển dữ liệu giữa các app",
        },
      ],
    },
    quiz: [
      {
        question: "Việc lặp đi lặp lại nào AI giúp được nhiều nhất?",
        options: [
          "Soạn đi soạn lại email thông báo theo mẫu",
          "Quyết định tuyển ai vào công ty",
          "Ký hợp đồng",
          "Thay bạn họp với sếp",
        ],
        correctIndex: 0,
        explanation:
          "AI giỏi các việc lặp lại theo mẫu (email, tóm tắt, phân loại) — giải phóng thời gian cho việc cần phán đoán.",
      },
      {
        question:
          "Bạn nhờ AI tóm tắt một biên bản họp dài. Bước quan trọng sau đó?",
        options: [
          "Tin tuyệt đối bản tóm tắt",
          "Đọc lại & đối chiếu các đầu việc/điểm quan trọng",
          "Xóa biên bản gốc",
          "Gửi ngay cho cả công ty",
        ],
        correctIndex: 1,
        explanation:
          "Luôn kiểm tra lại bản tóm tắt, nhất là các đầu việc và con số quan trọng trước khi dùng.",
      },
      {
        question: "Điều nào KHÔNG nên làm khi dùng AI trong công việc?",
        options: [
          "Dùng AI để soạn nháp email",
          "Đưa toàn bộ dữ liệu khách hàng & hợp đồng mật lên công cụ công cộng",
          "Nhờ AI tóm tắt tài liệu công khai",
          "Hỏi AI cách dùng phần mềm",
        ],
        correctIndex: 1,
        explanation:
          "Không đưa dữ liệu mật/cá nhân lên công cụ AI công cộng. Dùng cho việc chung công khai thì an toàn.",
      },
      {
        question:
          "Khi dùng AI soạn nội quy/chính sách công ty, điều BẮT BUỘC là gì?",
        options: [
          "Ban hành ngay vì AI viết chuẩn",
          "Người + pháp chế rà lại tính hợp pháp trước khi áp dụng",
          "Sao chép nội quy công ty khác",
          "Giữ bí mật không cho nhân viên biết",
        ],
        correctIndex: 1,
        explanation:
          "AI có thể viết sai/thiếu so với luật; trách nhiệm pháp lý thuộc con người.",
      },
      {
        question:
          "Khi AI chỉ ra một con số bất thường trong dữ liệu nhân sự, HR nên làm gì?",
        options: [
          "Tin ngay và xử lý nhân viên",
          "Xác minh nguồn gốc (có thể lỗi nhập) trước khi kết luận",
          "Bỏ qua vì AI hay sai",
          "Công khai cho cả công ty",
        ],
        correctIndex: 1,
        explanation:
          "Số bất thường có thể do lỗi dữ liệu; cần kiểm chứng trước khi ra quyết định ảnh hưởng con người.",
      },
      {
        question:
          "Trước khi nhờ AI công cộng kiểm tra bảng lương, việc BẮT BUỘC là gì?",
        options: [
          "Gửi nguyên file có tên + số tài khoản cho nhanh",
          "Ẩn danh: bỏ tên, mã NV, số tài khoản — chỉ giữ số liệu cần tính",
          "Không cần, lương không nhạy cảm",
          "Đăng lên nhóm chung để nhiều người xem",
        ],
        correctIndex: 1,
        explanation:
          "Lương + thông tin định danh là dữ liệu nhạy cảm; phải ẩn danh trước khi đưa lên công cụ AI công cộng.",
      },
      {
        question: "Mục tiêu đào tạo nào sau đây 'đo được' (tốt nhất)?",
        options: [
          "Giúp nhân viên hiểu hơn về an toàn",
          "Sau buổi học, 90% nhân viên đạt ≥8/10 bài kiểm tra an toàn lao động",
          "Nâng cao nhận thức chung",
          "Làm nhân viên yêu thích công ty",
        ],
        correctIndex: 1,
        explanation:
          "Mục tiêu tốt phải cụ thể, đo lường được — nền tảng để đánh giá hiệu quả đào tạo.",
      },
      {
        question:
          "Bạn muốn AI soạn email thông báo chính sách mới. Dữ kiện nào cần có?",
        options: [
          "Người nhận, điểm thay đổi chính, ngày hiệu lực, việc cần làm và kênh hỏi đáp",
          "Chỉ ghi 'viết email chính sách'",
          "Yêu cầu AI tự bịa ngày hiệu lực",
          "Gửi bản nháp không qua duyệt",
        ],
        correctIndex: 0,
        explanation:
          "Thông báo nội bộ cần rõ đối tượng, nội dung thay đổi, thời hạn và kênh hỗ trợ. AI không nên tự bịa thông tin vận hành.",
      },
      {
        question:
          "Khi nhờ AI tạo checklist onboarding, lựa chọn nào tốt nhất?",
        options: [
          "Cung cấp vai trò nhân viên, mốc thời gian, tài liệu cần đọc và người phụ trách từng bước",
          "Chỉ yêu cầu 'làm onboarding'",
          "Bỏ qua người phụ trách vì AI sẽ tự làm",
          "Đưa dữ liệu lương cá nhân vào checklist",
        ],
        correctIndex: 0,
        explanation:
          "Checklist hữu ích khi có timeline, trách nhiệm và tài liệu rõ. Không cần đưa dữ liệu cá nhân nhạy cảm vào prompt.",
      },
      {
        question:
          "AI tóm tắt biên bản họp thành đầu việc, nhưng thiếu người phụ trách. Bạn nên làm gì?",
        options: [
          "Tự đối chiếu ghi chú gốc hoặc hỏi lại team trước khi gửi",
          "Để trống rồi coi như đã giao việc",
          "Tự gán ngẫu nhiên",
          "Xóa toàn bộ biên bản",
        ],
        correctIndex: 0,
        explanation:
          "Đầu việc vận hành cần người phụ trách rõ. Nếu AI thiếu dữ kiện, phải đối chiếu nguồn gốc hoặc xác nhận lại trước khi thông báo.",
      },
    ],
  },

  khac: {
    id: "khac",
    label: "Nhân viên văn phòng",
    shortLabel: "Văn phòng / Khác",
    icon: "💼",
    color: "#6B5B95",
    modules: [
      {
        id: "khac-m1",
        title: "AI là gì? Nó giúp được gì cho nhân viên văn phòng",
        durationMin: 15,
        level: 1,
        content:
          "AI giúp bạn xử lý nhanh email, tóm tắt tài liệu, lên checklist công việc — những việc lặp lại mỗi ngày. Bạn ra lệnh rõ, AI làm nháp, bạn duyệt rồi gửi.",
        learnings: [
          "Hiểu AI bằng ngôn ngữ đời thường",
          "3 việc AI làm tốt cho văn phòng",
          "Điều AI không thay được con người",
        ],
      },
      {
        id: "khac-m2",
        title: "Viết email & tin nhắn công việc bằng AI",
        durationMin: 20,
        level: 1,
        content:
          "Prompt tốt = vai trò + bối cảnh + yêu cầu. VD: 'Bạn là nhân viên hành chính. Viết email nhắc họp lúc 14h thứ Sáu, giọng lịch sự, ≤100 từ, có link phòng họp.'",
        learnings: [
          "Cấu trúc prompt email",
          "Giọng văn phù hợp tình huống",
          "Luôn đọc lại trước khi gửi",
        ],
      },
      {
        id: "khac-m3",
        title: "Tóm tắt tài liệu & biên bản dài",
        durationMin: 20,
        level: 2,
        content:
          "Dán nội dung (đã ẩn danh) → nhờ AI tóm tắt 5 ý chính + đầu việc + deadline. Tiết kiệm 20–30 phút mỗi lần đọc tài liệu dài.",
        learnings: [
          "Tóm tắt có cấu trúc",
          "Trích đầu việc & deadline",
          "Ẩn danh dữ liệu nhạy cảm",
        ],
      },
      {
        id: "khac-m4",
        title: "Lên checklist & kế hoạch tuần",
        durationMin: 20,
        level: 2,
        content:
          "Liệt kê việc cần làm → AI gợi ý thứ tự ưu tiên, chia theo ngày, nhắc deadline. Dùng cho công việc cá nhân hoặc hỗ trợ team nhỏ.",
        learnings: [
          "Ưu tiên công việc",
          "Chia việc theo ngày",
          "Theo dõi deadline",
        ],
      },
      {
        id: "khac-m5",
        title: "Họp & ghi chú nhanh với AI",
        durationMin: 20,
        level: 3,
        content:
          "Ghi chú thô trong họp → AI soạn biên bản: chủ đề, quyết định, người phụ trách, việc cần làm. Gửi team trong 10 phút sau họp.",
        learnings: [
          "Biên bản họp gọn",
          "Phân công rõ ràng",
          "Gửi sớm sau họp",
        ],
      },
      {
        id: "khac-m6",
        title: "An toàn dữ liệu khi dùng AI",
        durationMin: 15,
        level: 3,
        content:
          "Không đưa lương, hợp đồng mật, CMND, mật khẩu lên công cụ AI công cộng. Mô tả tình huống chung, ẩn tên khách hàng.",
        learnings: [
          "Dữ liệu không nên paste",
          "Ẩn danh khi hỏi AI",
          "Kiểm tra lại kết quả",
        ],
      },
    ],
    starterKit: {
      prompts: [
        {
          title: "Email nhắc deadline",
          prompt:
            "Viết email nhắc đồng nghiệp nộp báo cáo trước [NGÀY], giọng thân thiện, ≤80 từ, có bullet việc cần nộp.",
        },
        {
          title: "Tóm tắt tài liệu",
          prompt:
            "Tóm tắt văn bản sau thành: (1) 3 ý chính, (2) việc cần làm, (3) deadline nếu có. [DÁN NỘI DUNG]",
        },
        {
          title: "Checklist công việc tuần",
          prompt:
            "Từ danh sách việc: [LIỆT KÊ]. Sắp xếp theo ưu tiên, gợi ý chia 5 ngày làm việc, dạng bảng.",
        },
      ],
      tools: [
        {
          name: "ChatGPT",
          color: "#10A37F",
          desc: "Soạn email, tóm tắt, checklist.",
          useFor: "Email & tài liệu hằng ngày",
        },
        {
          name: "Claude",
          color: "#D97757",
          desc: "Tóm tắt văn bản dài, biên bản.",
          useFor: "Đọc & tóm tắt tài liệu",
        },
        {
          name: "Copilot",
          color: "#0F6CBD",
          desc: "Hỗ trợ trong Word, Excel, Outlook.",
          useFor: "Soạn thảo trong Office",
        },
        {
          name: "Notion AI",
          color: "#000000",
          desc: "Ghi chú & tổ chức việc team.",
          useFor: "Wiki nội bộ & task list",
        },
      ],
    },
    quiz: [
      {
        question: "Việc nào AI giúp nhân viên văn phòng hiệu quả nhất?",
        options: [
          "Soạn nháp email và tóm tắt tài liệu",
          "Quyết định sa thải nhân viên",
          "Ký hợp đồng thay sếp",
          "Thay bạn đi họp với khách",
        ],
        correctIndex: 0,
        explanation:
          "AI mạnh ở việc lặp lại theo mẫu: email, tóm tắt, checklist — giải phóng thời gian cho việc cần phán đoán.",
      },
      {
        question: "Bạn nhờ AI tóm tắt biên bản họp. Bước quan trọng sau đó?",
        options: [
          "Gửi ngay không đọc",
          "Đối chiếu đầu việc và deadline với ghi chú gốc",
          "Xóa biên bản gốc",
          "Đăng lên mạng xã hội",
        ],
        correctIndex: 1,
        explanation:
          "Luôn kiểm tra lại — AI có thể bỏ sót hoặc hiểu sai chi tiết quan trọng.",
      },
      {
        question: "Điều KHÔNG nên làm khi dùng AI ở công ty?",
        options: [
          "Dùng AI soạn nháp email nội bộ",
          "Paste toàn bộ hồ sơ nhân sự mật lên ChatGPT công cộng",
          "Hỏi AI cách dùng Excel",
          "Nhờ AI lên checklist tuần",
        ],
        correctIndex: 1,
        explanation:
          "Dữ liệu nhân sự, lương, hợp đồng mật không đưa lên công cụ AI công cộng.",
      },
      {
        question:
          "Bạn muốn AI tóm tắt một tài liệu dài cho sếp. Cách yêu cầu nào tốt nhất?",
        options: [
          "Tóm tắt thành 5 ý chính, nêu việc cần quyết định và rủi ro còn thiếu dữ liệu",
          "Tóm tắt càng dài càng tốt",
          "Tự bịa kết luận nếu tài liệu chưa nói",
          "Chỉ dịch tiêu đề",
        ],
        correctIndex: 0,
        explanation:
          "Tóm tắt hữu ích cần ngắn, có cấu trúc và phân biệt rõ dữ kiện có thật với phần còn thiếu.",
      },
      {
        question:
          "Khi dùng AI viết checklist công việc tuần, dữ kiện nào nên đưa vào?",
        options: [
          "Mục tiêu tuần, deadline, mức ưu tiên và các ràng buộc quan trọng",
          "Mật khẩu các phần mềm làm việc",
          "Thông tin cá nhân của đồng nghiệp",
          "Không cần mục tiêu",
        ],
        correctIndex: 0,
        explanation:
          "AI lập checklist tốt khi hiểu mục tiêu, deadline và mức ưu tiên. Không đưa mật khẩu hoặc dữ liệu cá nhân vào prompt.",
      },
      {
        question:
          "AI đưa ra hướng dẫn dùng một phần mềm nội bộ nhưng bạn chưa từng cung cấp tài liệu. Bạn nên?",
        options: [
          "Làm theo ngay",
          "Kiểm tra lại với tài liệu nội bộ hoặc người phụ trách hệ thống",
          "Gửi cho cả phòng như quy trình chính thức",
          "Đổi mật khẩu theo lời AI",
        ],
        correctIndex: 1,
        explanation:
          "AI có thể đoán sai phần mềm nội bộ. Quy trình chính thức phải dựa trên tài liệu hoặc người phụ trách thật.",
      },
      {
        question:
          "Prompt nào phù hợp để nhờ AI viết email xin dời lịch họp?",
        options: [
          "Viết email lịch sự xin dời lịch họp với [đối tượng], nêu lý do ngắn, đề xuất 2 khung giờ mới",
          "Dời lịch đi",
          "Tự bịa lý do càng nghiêm trọng càng tốt",
          "Viết email thật dài",
        ],
        correctIndex: 0,
        explanation:
          "Prompt tốt nêu người nhận, mục tiêu, giọng văn và thông tin cần có. Không nên để AI bịa lý do.",
      },
      {
        question:
          "Khi dùng AI tạo bảng so sánh lựa chọn công cụ, tiêu chí nào nên yêu cầu?",
        options: [
          "Chi phí, tính năng, rủi ro dữ liệu, độ dễ dùng và khuyến nghị có điều kiện",
          "Chỉ chọn công cụ nổi tiếng nhất",
          "Bỏ qua bảo mật vì là công cụ văn phòng",
          "Chọn theo câu trả lời dài nhất",
        ],
        correctIndex: 0,
        explanation:
          "So sánh công cụ cần tiêu chí rõ, đặc biệt chi phí và dữ liệu. Khuyến nghị nên có điều kiện thay vì tuyệt đối.",
      },
      {
        question:
          "Cách nào giúp bạn kiểm tra câu trả lời của AI tốt hơn?",
        options: [
          "Yêu cầu AI nêu giả định, nguồn cần kiểm chứng và các bước tự kiểm tra",
          "Chỉ chọn câu trả lời tự tin nhất",
          "Không bao giờ hỏi lại",
          "Dùng nếu câu trả lời có nhiều thuật ngữ",
        ],
        correctIndex: 0,
        explanation:
          "AI có thể sai dù tự tin. Nêu giả định và bước kiểm chứng giúp người dùng kiểm soát chất lượng đầu ra.",
      },
      {
        question:
          "Sau khi AI tạo bản nháp quy trình nội bộ, việc nào nên làm trước khi áp dụng?",
        options: [
          "Nhờ người phụ trách nghiệp vụ rà soát và thử với một tình huống nhỏ",
          "Áp dụng ngay cho toàn công ty",
          "Xóa quy trình cũ không cần đối chiếu",
          "Giữ bí mật để tránh ai góp ý",
        ],
        correctIndex: 0,
        explanation:
          "Quy trình nội bộ cần được người có trách nhiệm kiểm tra và thử nhỏ trước khi áp dụng rộng.",
      },
    ],
  },
};

export const ROLE_LIST = Object.values(ROLES);

export function getRole(id: string): Role | null {
  return ROLES[id] ?? null;
}

// Lọc modules theo cấp độ AI hiện tại của user.
// >5 điểm: skip level 1 (nhập môn), bắt đầu từ level 2.
export function getModulesForUser(roleId: string, aiLevel: number): RoleModule[] {
  const role = getRole(roleId);
  if (!role) return [];
  if (aiLevel >= 5) {
    return role.modules.filter((m) => m.level >= 2);
  }
  return role.modules;
}

// Module kèm nguồn (foundation / theo kỹ năng) — dùng cho builder mục 3.
export type ComposedModule = RoleModule & {
  roleId: string;
  source: { type: "foundation" | "skill"; label: string };
};

// Tất cả module nền tảng (isFoundation) trên mọi vai trò, khử trùng theo skill.
export function getFoundationModules(): ComposedModule[] {
  const seen = new Set<string>();
  const out: ComposedModule[] = [];
  for (const role of ROLE_LIST) {
    for (const m of role.modules) {
      if (!m.isFoundation) continue;
      const key = (m.skills?.[0] ?? m.id) + "|" + m.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...m,
        roleId: role.id,
        source: { type: "foundation", label: "Nền tảng" },
      });
    }
  }
  return out;
}

// Module dạy một kỹ năng cụ thể (theo slug), gộp mọi vai trò.
export function getModulesBySkill(skillSlug: string): ComposedModule[] {
  const out: ComposedModule[] = [];
  for (const role of ROLE_LIST) {
    for (const m of role.modules) {
      if (m.isFoundation) continue;
      if (m.skills?.includes(skillSlug)) {
        out.push({
          ...m,
          roleId: role.id,
          source: { type: "skill", label: SKILL_LABELS[skillSlug] ?? skillSlug },
        });
      }
    }
  }
  return out;
}

// Ráp lộ trình từ danh sách kỹ năng: Nền tảng + module theo từng kỹ năng,
// sắp theo cấp độ (Nền tảng → level 1 → 2 → 3). KHÔNG kéo-thả ở v1.
export function composePathFromSkills(skillSlugs: string[]): ComposedModule[] {
  const byId = new Map<string, ComposedModule>();
  for (const m of getFoundationModules()) byId.set(m.id, m);
  for (const slug of skillSlugs) {
    for (const m of getModulesBySkill(slug)) {
      if (!byId.has(m.id)) byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const fa = a.source.type === "foundation" ? 0 : 1;
    const fb = b.source.type === "foundation" ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.level - b.level;
  });
}

// Các kỹ năng có ít nhất 1 module — để builder hiện chip kỹ năng.
export function getAvailableSkills(): { slug: string; label: string }[] {
  const slugs = new Set<string>();
  for (const role of ROLE_LIST) {
    for (const m of role.modules) {
      if (m.isFoundation) continue;
      for (const s of m.skills ?? []) slugs.add(s);
    }
  }
  return [...slugs].map((slug) => ({
    slug,
    label: SKILL_LABELS[slug] ?? slug,
  }));
}
