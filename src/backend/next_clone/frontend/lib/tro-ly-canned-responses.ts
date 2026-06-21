// Canned responses cho demo mode — khi chưa cấu hình OpenAI key.
// Mỗi role có vài câu hỏi phổ biến + answer mock. Khi user hỏi gì khác,
// dùng generic response gợi ý cấu hình OpenAI.

import { getLearningModuleById, getLearningModulesByRole } from "@/lib/learning-modules-data";

export type CannedResponse = {
  // Pattern (regex) match câu hỏi user.
  pattern: RegExp;
  answer: string;
};

const COMMON: CannedResponse[] = [
  {
    pattern: /AI là gì|ai la gi|gì là AI|chatgpt là gì/i,
    answer: `AI (Trí tuệ nhân tạo) là công cụ giúp bạn xử lý nhanh các việc lặp lại trong công việc — như viết email, tóm tắt văn bản, gợi ý ý tưởng.

Nghĩ đơn giản: AI giống một trợ lý mới vào nghề — bạn ra lệnh rõ ràng, nó làm nháp, BẠN duyệt rồi gửi đi. AI KHÔNG thay được phán đoán của bạn — quyết định cuối vẫn là con người.

**Bạn có thể bắt đầu thử bằng:**
- Hỏi nó tóm tắt một đoạn dài
- Nhờ nó viết nháp email
- Đặt câu hỏi về công việc — nó sẽ giải thích`,
  },
  {
    pattern: /an toàn|bảo mật|nhạy cảm|riêng tư|không nên/i,
    answer: `Đây là 3 nguyên tắc an toàn dữ liệu khi dùng AI công cộng (ChatGPT, Claude, Gemini...):

**1. KHÔNG dán dữ liệu nhạy cảm**
- Lương nhân viên, số tài khoản, MST khách hàng
- Hợp đồng còn hiệu lực, mật khẩu, thông tin căn cước
- Tài liệu nội bộ có dấu "MẬT"

**2. Ẩn danh khi hỏi**
Thay vì "Khách Nguyễn Văn A ở 123 Trần Hưng Đạo..." → "Khách mua đợt 50 triệu, đang phân vân..."

**3. Đọc lại trước khi gửi**
AI có thể "bịa số" hoặc cam kết không thực tế. Bạn chịu trách nhiệm cho nội dung mình gửi đi.`,
  },
  {
    pattern: /prompt là gì|viết prompt|prompt tốt/i,
    answer: `Prompt = câu lệnh bạn gõ cho AI. Prompt tốt có 4 phần:

**1. Vai trò:** "Bạn là một [chuyên gia/nhân viên gì]"
**2. Bối cảnh:** ai sẽ đọc, hoàn cảnh
**3. Yêu cầu cụ thể:** làm gì, độ dài, format
**4. Ví dụ (nếu cần):** mẫu để AI bắt chước

**So sánh:**
❌ "Viết email" → kết quả mơ hồ
✅ "Bạn là nhân viên bán đệm cao cấp. Viết email chào khách công ty 50 nhân viên vừa chuyển văn phòng, giọng thân thiện, ≤120 từ, kết bằng lời mời đặt lịch xem hàng."

Càng cụ thể → kết quả càng sát.`,
  },
];

function formatNextLearningAnswer(roleId: string): string {
  const modules = getLearningModulesByRole(roleId, 0).slice(0, 3);
  if (modules.length === 0) {
    return "";
  }

  const lines = modules.map((mod, index) => {
    const title = getLearningModuleById(mod.id)?.title ?? mod.title;
    return `${index + 1}. [${title}](/lo-trinh/${mod.id})`;
  });

  return `Nếu anh/chị hỏi "học gì tiếp", em khuyên đi theo đúng thứ tự này trước:\n\n${lines.join("\n")}\n\nLý do: đi từ module nhập môn trước, rồi sang bài thực hành sát việc hơn.`;
}

const BY_ROLE: Record<string, CannedResponse[]> = {
  "kinh-doanh": [
    {
      pattern: /chốt sale|chốt đơn|đắt quá|từ chối/i,
      answer: `Khi khách nói "đắt quá", thử dùng AI để chuẩn bị 3 hướng phản hồi:

**1. Tách câu chuyện giá khỏi giá trị**
"Em hiểu anh đang so giá. Trước khi em tư vấn gói phù hợp, anh có thể chia sẻ ngân sách dự kiến để em xem có cách tối ưu không?"

**2. Đặt lại bối cảnh**
"Nếu so giá đơn thuần thì đúng là chỗ khác có rẻ hơn. Nhưng [SẢN PHẨM] của bên em đi kèm [BẢO HÀNH/HỖ TRỢ/...]. Anh quan tâm yếu tố nào nhất?"

**3. Giảm rào cản thử**
"Em hiểu rồi. Hay anh thử 1 [GÓI NHỎ HƠN] để cảm nhận trước, nếu OK thì mở rộng sau?"

**Mẹo:** dùng AI luyện phản xạ — nhờ ChatGPT đóng vai khách khó tính + cho phản hồi của mình → AI gợi ý cách trả lời tốt hơn.`,
    },
    {
      pattern: /email|chào hàng|chào khách/i,
      answer: `Đây là template prompt viết email chào hàng siêu hiệu quả:

\`\`\`
Bạn là nhân viên bán [SẢN PHẨM].
Viết email chào khách [LOẠI KHÁCH + TÌNH HUỐNG],
giọng [TONE: thân thiện/trang trọng],
độ dài ≤120 từ,
mục tiêu cuối: [đặt lịch xem hàng/gọi điện/v.v.]
Đừng dùng từ khoa trương như "tuyệt vời", "đẳng cấp".
\`\`\`

**Ví dụ thực tế:**
"Bạn là nhân viên bán ghế văn phòng cao cấp. Viết email chào công ty 50 nhân viên vừa chuyển văn phòng tại Quận 1 TP HCM, giọng thân thiện chuyên nghiệp, ≤120 từ, kết bằng lời mời đặt lịch 30 phút xem hàng tại văn phòng họ."

Bạn copy template trên + điền [...] cho phù hợp công việc của bạn nhé.`,
    },
    {
      pattern: /học gì tiếp|nên học gì tiếp|tiếp theo học gì|module nào tiếp/i,
      answer: formatNextLearningAnswer("kinh-doanh"),
    },
  ],

  "ke-toan": [
    {
      pattern: /excel|công thức|hàm/i,
      answer: `Khi cần công thức Excel khó, đây là cách hỏi AI:

**Template prompt:**
\`\`\`
Tôi cần viết công thức Excel để [MÔ TẢ MỤC ĐÍCH].
Dữ liệu: cột A = [...], cột B = [...]
Cho công thức, giải thích từng phần, có ví dụ với dữ liệu mẫu.
\`\`\`

**Ví dụ:**
"Tôi cần viết công thức Excel để tính số ngày làm việc giữa 2 ngày, không tính cuối tuần và ngày lễ. Cột A = ngày bắt đầu, cột B = ngày kết thúc, danh sách ngày lễ ở cột E2:E20. Cho công thức + giải thích."

**Mẹo bonus:** sau khi nhận công thức, hỏi tiếp "Nếu dữ liệu của tôi có lỗi #VALUE thì xử lý sao?" — AI sẽ thêm IFERROR cho an toàn.`,
    },
    {
      pattern: /báo cáo|tài chính|tóm tắt/i,
      answer: `Tóm tắt báo cáo tài chính 20 trang trong 5 phút:

**Bước 1:** Dùng Claude (xử lý văn bản dài tốt hơn ChatGPT)

**Bước 2:** Upload PDF hoặc paste nội dung + prompt sau:
\`\`\`
Tóm tắt báo cáo tài chính này thành 5 phần ngắn:
1. Tổng doanh thu kỳ này vs kỳ trước
2. Chi phí lớn nhất + thay đổi
3. Lợi nhuận gộp & ròng
4. 3 điểm bất thường đáng chú ý
5. Đề xuất 1-2 việc cần làm ngay

Trả lời dạng bullet, ngôn ngữ đơn giản cho CEO.
\`\`\`

**QUAN TRỌNG:** Các con số AI đưa ra phải tự verify lại với sổ gốc. AI có thể "bịa số" hoặc đọc nhầm bảng. Đừng tin tuyệt đối.`,
    },
    {
      pattern: /học gì tiếp|nên học gì tiếp|tiếp theo học gì|module nào tiếp/i,
      answer: formatNextLearningAnswer("ke-toan"),
    },
  ],

  marketing: [
    {
      pattern: /content|nội dung|viết bài/i,
      answer: `Để content AI viết không bị nhạt "giọng AI", áp dụng 3 kỹ thuật:

**1. Dạy AI giọng văn brand**
Trước khi nhờ viết, paste 2-3 bài hay nhất của bạn + nói: "Đây là giọng văn brand. Viết bài mới giữ đúng giọng này."

**2. Yêu cầu cụ thể đến từng chi tiết**
❌ "Viết bài về cà phê"
✅ "Viết caption Facebook 80 từ về cà phê pha máy mới, đối tượng dân văn phòng 25-35 tuổi, giọng vui hài, có 1 câu hỏi cuối để comment."

**3. Biên tập lại — đây là bước QUAN TRỌNG nhất**
- Thay từ chung chung ("tuyệt vời", "đẳng cấp") bằng chi tiết cụ thể
- Thêm 1 cảm xúc/quan sát cá nhân
- Đọc to để tự nghe có giống mình nói không

AI viết nháp, BẠN là biên tập viên.`,
    },
    {
      pattern: /tiêu đề|headline|caption/i,
      answer: `Prompt sinh 20 tiêu đề chất lượng:

\`\`\`
Viết 20 tiêu đề Facebook cho [SẢN PHẨM/CHỦ ĐỀ],
đối tượng [TUỔI + ĐẶC ĐIỂM],
giọng [TONE],
mỗi tiêu đề ≤12 từ.

Đa dạng góc nhìn:
- 5 tiêu đề hài hước
- 5 tiêu đề FOMO (sợ bỏ lỡ)
- 5 tiêu đề lợi ích cụ thể
- 5 tiêu đề câu hỏi/sốc
\`\`\`

**Mẹo:** sau khi nhận 20 tiêu đề, hỏi tiếp:
"Trong 20 tiêu đề trên, chọn 3 cái có khả năng dừng mắt người đọc cao nhất + giải thích vì sao chọn."

→ Bạn vừa có nhiều lựa chọn vừa hiểu logic.`,
    },
    {
      pattern: /học gì tiếp|nên học gì tiếp|tiếp theo học gì|module nào tiếp/i,
      answer: formatNextLearningAnswer("marketing"),
    },
  ],

  "van-hanh": [
    {
      pattern: /email|soạn|từ chối/i,
      answer: `Template email từ chối lịch sự (lưu lại dùng nhiều lần):

**Prompt:**
\`\`\`
Soạn email từ chối [DỊCH VỤ/ỨNG VIÊN/ĐỀ XUẤT] một cách:
- Lịch sự, tôn trọng
- Cảm ơn họ đã quan tâm
- Nêu lý do ngắn gọn (không kể chi tiết)
- Để mở cửa cho tương lai nếu phù hợp
- ≤80 từ
\`\`\`

**Mẹo dùng:**
- Lưu template trong Notes/Notion → mỗi lần cần chỉ paste + đổi tên
- Có thể nhờ AI viết 3 phiên bản (formal/semi-formal/friendly) cho các tình huống khác nhau

Tiết kiệm 15 phút mỗi lần phải viết email khó này.`,
    },
    {
      pattern: /họp|biên bản|tóm tắt/i,
      answer: `Tóm tắt biên bản họp dài thành đầu việc rõ ràng:

**Prompt mẫu:**
\`\`\`
Tóm tắt biên bản họp sau thành:
1. CHỦ ĐỀ CHÍNH (1 câu)
2. QUYẾT ĐỊNH ĐÃ CHỐT (bullet)
3. ĐẦU VIỆC + NGƯỜI CHỊU TRÁCH NHIỆM + DEADLINE
4. VIỆC CÒN VƯỚNG / CẦN THẢO LUẬN TIẾP
5. NGÀY HỌP TIẾP

Format: dạng bảng cho phần 3.
[DÁN BIÊN BẢN HOẶC TRANSCRIPT GHI ÂM]
\`\`\`

**Workflow đầy đủ:**
1. Ghi âm họp (xin phép trước!) + dùng Fireflies/Otter để transcript
2. Paste transcript vào Claude
3. Prompt trên → ra checklist gọn
4. Gửi cho team trong 2 phút sau họp

Tiết kiệm 30 phút sau mỗi cuộc họp 1 giờ.`,
    },
    {
      pattern: /học gì tiếp|nên học gì tiếp|tiếp theo học gì|module nào tiếp/i,
      answer: formatNextLearningAnswer("van-hanh"),
    },
  ],
};

const OFF_TOPIC: CannedResponse = {
  pattern: /./,
  answer: `Em chỉ tư vấn về **AI trong công việc**: cách dùng prompt, công cụ AI, an toàn dữ liệu, ứng dụng AI vào nghề của anh/chị.

Câu hỏi vừa rồi nằm ngoài phạm vi này. Anh/chị thử hỏi em những việc kiểu:
- "AI giúp em [công việc cụ thể] thế nào?"
- "Viết prompt để [mục tiêu]"
- "Công cụ AI nào phù hợp cho [nhiệm vụ]"

(Đây là phiên bản demo. Khi cấu hình OpenAI key thật, em sẽ trả lời được mọi câu hỏi về AI cho công việc.)`,
};

import { getSafetyWarning } from "@/lib/safety";

export function findCannedResponse(
  question: string,
  roleId: string,
): { answer: string; safety?: string } {
  const safetyWarning = getSafetyWarning(question);

  const roleResponses = BY_ROLE[roleId] ?? [];
  for (const r of [...COMMON, ...roleResponses]) {
    if (r.pattern.test(question)) {
      return { answer: r.answer, safety: safetyWarning };
    }
  }
  return { answer: OFF_TOPIC.answer, safety: safetyWarning };
}

export function getSuggestedQuestions(roleId: string): string[] {
  const suggestions: Record<string, string[]> = {
    "kinh-doanh": [
      "AI là gì? Giúp em việc bán hàng thế nào?",
      "Khách nói 'đắt quá', em trả lời sao với AI?",
      "Viết prompt soạn email chào hàng đỉnh nhất?",
      "Em có nên đưa thông tin khách vào ChatGPT không?",
    ],
    "ke-toan": [
      "AI giúp em tóm tắt báo cáo tài chính thế nào?",
      "Cách dùng AI viết công thức Excel khó",
      "Dữ liệu kế toán nào không được đưa lên AI?",
      "AI có thể giúp đối chiếu hóa đơn không?",
    ],
    marketing: [
      "Làm sao content AI không bị giọng văn AI?",
      "Viết prompt sinh 20 tiêu đề Facebook",
      "AI giúp lên content tháng thế nào?",
      "Có nên đăng nguyên văn AI viết không?",
    ],
    "van-hanh": [
      "AI giúp em tóm tắt biên bản họp thế nào?",
      "Soạn email từ chối ứng viên lịch sự",
      "Cách dùng AI tự động hóa việc lặp lại",
      "Dữ liệu nội bộ nào không nên đưa lên AI?",
    ],
    khac: [
      "AI giúp em viết email công việc thế nào?",
      "Cách tóm tắt tài liệu dài bằng AI?",
      "Dữ liệu nào không nên đưa lên ChatGPT?",
      "Lên checklist tuần với AI ra sao?",
    ],
  };
  return suggestions[roleId] ?? [];
}

export function getManagerSuggestedQuestions(): string[] {
  return [
    "Nhân viên nào đang chậm tiến độ học?",
    "Tóm tắt tiến độ team tuần này",
    "Ai có điểm quiz thấp cần kèm thêm?",
    "Gợi ý hành động kèm cặp nhân viên dùng AI",
  ];
}
