// Canned responses cho demo mode — khi chưa cấu hình OpenAI key.
// Mỗi role có vài câu hỏi phổ biến + answer mock. Khi user hỏi gì khác,
// dùng generic response gợi ý cấu hình OpenAI.

import { getLearningModuleById, getLearningModulesByRole } from "@/lib/learning-modules-data";
import { stripLeadingAssistantGreeting } from "@/lib/chat-prompt-safety";

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
  {
    pattern: /chưa sát|chưa đúng|sai rồi|sửa lại|nâng cấp câu trả lời|câu trả lời sao rồi|feedback/i,
    answer: `Em hiểu rồi. Để sửa cho sát hơn, em cần bạn chọn 1 chỗ lệch nhất: phạm vi, dữ liệu đầu vào, định dạng đầu ra, hay giọng văn.

Chỉ cần nói 1 ý lệch quan trọng nhất, em sẽ viết lại bản tốt hơn ngay.`,
  },
  {
    pattern: /quá chung|chung chung|quá mơ hồ|(?:câu|câu trả lời|trả lời).{0,24}không rõ|chưa cụ thể/i,
    answer: `Em thấy câu trả lời còn hơi chung. Nếu bạn muốn, hãy nói rõ 1 điểm lệch nhất: phạm vi việc, dữ liệu đang có, hay output cuối.

Có 1 ý lệch quan trọng nhất là đủ để em viết lại sát hơn.`,
  },
  {
    pattern: /quá dài|dài quá|rút gọn|ngắn lại|ngắn hơn/i,
    answer: `Em sẽ rút gọn phần trả lời theo đúng ý chính.

Nếu muốn, bạn có thể nói thêm là cần giữ ví dụ, giữ số bước, hay chỉ cần bản chốt nhanh.`,
  },
  {
    pattern: /chỉ cần bản sửa|chỉ sửa thôi|khỏi giải thích|đừng giải thích|sửa luôn/i,
    answer: `Em sẽ đi thẳng vào bản sửa, không vòng vo giải thích lại.

Nếu bạn muốn, em có thể giữ đúng giọng cũ nhưng thay toàn bộ phần chưa sát.`,
  },
  {
    pattern: /bản cuối|phiên bản cuối|chốt bản|final version|bản sạch/i,
    answer: `Em sẽ đưa luôn bản cuối, gọn và sạch để bạn dùng ngay.

Nếu cần, em có thể giữ một bản đầy đủ hơn ở dưới để bạn chọn nhanh.`,
  },
  {
    pattern: /1 câu|một câu|rất ngắn|siêu ngắn|ngắn nhất/i,
    answer: `Em sẽ nén lại thành bản cực ngắn, chỉ giữ ý chốt cuối cùng.

Nếu bạn muốn, em có thể gói luôn thành 1 câu duy nhất để copy gửi đi.`,
  },
  {
    pattern: /2 phiên bản|hai phiên bản|2 bản|bản ngắn và bản dài|bản ngắn.*bản đầy đủ/i,
    answer: `Em sẽ làm luôn 2 phiên bản: một bản ngắn để chốt nhanh và một bản đầy đủ để bạn xem kỹ.

Nếu muốn, em có thể ghi rõ đâu là bản nên dùng ngay, đâu là bản để tham khảo.`,
  },
  {
    pattern:
      /đổi sang checklist|dạng checklist|chuyển sang checklist|đổi sang bảng|dạng bảng|chuyển sang bảng/i,
    answer: `Em sẽ giữ nguyên ý chính nhưng đổi sang checklist hoặc bảng để dễ làm ngay.

Nếu bạn muốn, em có thể thêm cột "việc làm ngay" để nhìn ra bước tiếp theo thật nhanh.`,
  },
  {
    pattern: /việc làm ngay|làm ngay.*ưu tiên|ưu tiên.*làm ngay/i,
    answer: `Em sẽ chốt lại theo thứ tự ưu tiên việc làm ngay trước, rồi mới đến phần giải thích sau.

Nếu cần, em có thể rút thành 3 việc quan trọng nhất để bạn đem đi làm liền.`,
  },
  {
    pattern: /3 lựa chọn|ba lựa chọn|3 phương án|nhiều phương án|phương án khác/i,
    answer: `Em sẽ gom thành 3 lựa chọn rõ ràng để bạn chọn nhanh, thay vì trả lời một đường duy nhất.

Nếu muốn, em có thể ghi luôn khi nào nên chọn từng phương án.`,
  },
  {
    pattern: /ví dụ theo nghề|ví dụ thực tế|ví dụ đúng nghề|case thực tế/i,
    answer: `Em sẽ thêm ví dụ bám đúng nghề/công việc của bạn để dễ áp dụng hơn.

Nếu bạn muốn, em có thể đổi hẳn sang ví dụ HR, kế toán, sales, hoặc vận hành cho sát ngữ cảnh.`,
  },
  {
    pattern: /giọng người thật|bớt máy|tự nhiên hơn|đỡ máy/i,
    answer: `Em sẽ chỉnh giọng cho tự nhiên hơn, bớt kiểu máy móc.

Nếu muốn, em có thể viết theo kiểu nói chuyện đời thường nhưng vẫn giữ đúng ý chuyên môn.`,
  },
  {
    pattern: /so sánh 2|2 phương án|phương án nào|phân biệt/i,
    answer: `Em sẽ chuyển sang dạng so sánh để nhìn ra điểm khác nhau thật nhanh.

Nếu muốn, em có thể làm luôn bảng 2 cột: phương án A, phương án B, và khi nào nên chọn mỗi bên.`,
  },
  {
    pattern: /ưu nhược|ưu điểm|nhược điểm|điểm mạnh|điểm yếu|rủi ro/i,
    answer: `Em sẽ bóc ra luôn ưu, nhược và rủi ro để bạn nhìn nhanh chỗ cần cân nhắc.

Nếu muốn, em có thể xếp theo mức độ quan trọng: cái nào đáng lo nhất, cái nào chấp nhận được.`,
  },
  {
    pattern: /prompt copy|copy-paste|copy paste|prompt mẫu|mẫu prompt/i,
    answer: `Em sẽ viết lại thành prompt copy-paste để bạn dùng ngay.

Nếu muốn, em có thể giữ luôn placeholder để bạn chỉ việc thay phần [ ] theo việc của mình.`,
  },
  {
    pattern: /gửi sếp|bản gửi sếp|summary cho sếp|tóm tắt cho sếp|executive summary/i,
    answer: `Em sẽ rút thành bản ngắn kiểu gửi sếp: chỉ giữ ý chính, kết luận, rủi ro, và việc cần làm tiếp.

Nếu muốn, em cũng có thể chuyển sang giọng rất ngắn gọn, không lan man, để copy gửi luôn.`,
  },
  {
    pattern: /key takeaways|ý chính|chốt ý|chốt lại|takeaway/i,
    answer: `Em sẽ bóc ra đúng phần key takeaways trước, bỏ bớt phần kể lể.

Nếu bạn muốn, em có thể gom thành 3 gạch đầu dòng: điều cần nhớ, điều cần làm, điều cần tránh.`,
  },
  {
    pattern: /thiếu ví dụ|thêm ví dụ|mở rộng|chi tiết hơn|làm sâu|đổi giọng văn|đổi format/i,
    answer: `Em sẽ nâng cấp theo hướng bạn cần: thêm ví dụ, làm sâu hơn, đổi giọng văn, hoặc đổi format.

Nếu muốn sát hơn nữa, bạn chỉ cần nêu 1 kiểu mẫu bạn thích, em sẽ bám theo kiểu đó.`,
  },
  {
    pattern: /đúng nhưng chưa đủ sâu|chưa đủ sâu|nông quá|sâu hơn|đào sâu/i,
    answer: `Em sẽ đào sâu thêm phần đang còn nông.

Nếu muốn, bạn có thể nói rõ phần nào cần sâu hơn nhất: lý do, ví dụ thực tế, hay bước thực hiện.`,
  },
  {
    pattern: /lệch role|sai role|không đúng nghề|không đúng vai trò|sai ngữ cảnh nghề/i,
    answer: `Em hiểu, mình đang bị lệch nghề/ngữ cảnh rồi. Em sẽ chỉnh lại theo đúng role và ví dụ đúng công việc của bạn.

Nếu bạn muốn, hãy nói đúng 1 role hoặc 1 tình huống làm việc cụ thể để em bám sát hơn.`,
  },
  {
    pattern: /benchmark|kỳ trước|đối chiếu với kỳ trước|tháng trước|tuần trước/i,
    answer: `Em sẽ thêm phần so sánh với benchmark hoặc kỳ trước để câu trả lời có độ quyết định cao hơn.

Nếu bạn có mốc so sánh cụ thể, cứ nói luôn, em sẽ đưa vào bản sửa.`,
  },
];

/** Trả về câu trả lời gợi ý module tiếp theo, hoặc null nếu role không có modules. */
export function getNextLearningAnswer(roleId: string): string | null {
  const answer = formatNextLearningAnswer(roleId);
  return answer || null;
}

function formatNextLearningAnswer(roleId: string): string {
  const modules = getLearningModulesByRole(roleId, 0).slice(0, 3);
  if (modules.length === 0) {
    return "";
  }

  const lines = modules.map((mod, index) => {
    const title = getLearningModuleById(mod.id)?.title ?? mod.title;
    return `${index + 1}. [${title}](/lo-trinh/${mod.id})`;
  });

  return `Nếu bạn hỏi "học gì tiếp", em khuyên đi theo đúng thứ tự này trước:\n\n${lines.join("\n")}\n\nLý do: đi từ module nhập môn trước, rồi sang bài thực hành sát việc hơn.`;
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
      return {
        answer: stripLeadingAssistantGreeting(r.answer),
        safety: safetyWarning,
      };
    }
  }
  return {
    answer: stripLeadingAssistantGreeting(OFF_TOPIC.answer),
    safety: safetyWarning,
  };
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
