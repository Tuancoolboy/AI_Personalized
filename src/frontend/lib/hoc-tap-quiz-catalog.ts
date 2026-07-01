export const AVAILABLE_QUIZ_ROLE_IDS = [
  "van-hanh",
  "kinh-doanh",
  "marketing",
  "ke-toan",
  "khac",
] as const;

export type AvailableQuizRoleId = (typeof AVAILABLE_QUIZ_ROLE_IDS)[number];
export type HocTapQuizSort = "newest" | "question-count" | "xp";
export type HocTapQuizFilter = "all" | `department:${AvailableQuizRoleId}`;
export type QuizDifficulty = "Dễ" | "Trung bình" | "Khó";
export type HocTapQuizTopic =
  | "all"
  | "ai-co-ban"
  | "marketing"
  | "prompt"
  | "data"
  | "automation";
export type HocTapQuizDifficultyFilter = "all" | QuizDifficulty;
export type HocTapQuizTheme =
  | "hr"
  | "sales"
  | "marketing"
  | "accounting"
  | "office"
  | "prompt"
  | "data"
  | "automation";

export type HocTapQuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type HocTapQuizItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  creator: string;
  difficulty: QuizDifficulty;
  xp: number;
  publishedOrder: number;
  theme: HocTapQuizTheme;
  roleId: AvailableQuizRoleId | null;
  questionCount: number;
  durationMinutes: number;
  status: "available" | "coming-soon";
};

export type HocTapPlayableQuiz = HocTapQuizItem & {
  status: "available";
  roleId: AvailableQuizRoleId;
  questions: HocTapQuizQuestion[];
};

export type QuizReturnHref = "/lo-trinh" | "/hoc-tap";

const ROLE_ID_SET = new Set<string>(AVAILABLE_QUIZ_ROLE_IDS);

const DEMO_HOC_TAP_PROGRESS_KEY = "ai_troly_demo_hoc_tap_progress_v2";
const PROFILE_LEVEL_TARGET_XP = 100;

type HocTapPlayableQuizSeed = Omit<
  HocTapPlayableQuiz,
  "questionCount" | "status"
>;

const AVAILABLE_QUIZZES: HocTapPlayableQuizSeed[] = [
  {
    id: "ai-hanh-chinh-hr",
    title: "AI cơ bản cho Hành chính & HR",
    description:
      "Bộ đề thực hành để luyện cách dùng AI trong tuyển dụng, văn bản nội bộ và hành chính.",
    category: "Hành chính & HR",
    creator: "AI Trợ Lý",
    difficulty: "Dễ",
    xp: 50,
    publishedOrder: 8,
    theme: "hr",
    roleId: "van-hanh",
    durationMinutes: 15,
    questions: [
      {
        question:
          "Bạn muốn nhờ AI tóm tắt quy trình onboarding nhân viên mới. Cách nhập dữ liệu nào an toàn nhất?",
        options: [
          "Dán toàn bộ hồ sơ nhân sự kèm số điện thoại và lương",
          "Ẩn thông tin cá nhân, chỉ giữ các bước quy trình và câu hỏi cần tóm tắt",
          "Đưa tài khoản nội bộ cho AI để tự đọc tài liệu",
          "Nhờ AI tự đoán chính sách công ty",
        ],
        correctIndex: 1,
        explanation:
          "Bộ đề Học tập dùng để luyện tình huống thực tế. Khi dùng AI thật, hãy ẩn dữ liệu cá nhân và chỉ đưa phần cần xử lý.",
      },
      {
        question:
          "Khi dùng AI hỗ trợ lọc CV, lựa chọn nào phù hợp nhất với vai trò HR?",
        options: [
          "Để AI quyết định ai bị loại mà không cần người kiểm tra",
          "Tạo bảng tiêu chí rõ ràng rồi dùng AI gợi ý điểm cần xem lại",
          "Yêu cầu AI đánh giá tuổi, giới tính và ngoại hình ứng viên",
          "Copy nguyên CV lên công cụ công cộng mà không xin phép",
        ],
        correctIndex: 1,
        explanation:
          "AI nên hỗ trợ sàng lọc theo tiêu chí công việc, còn quyết định tuyển dụng và kiểm tra thiên kiến vẫn thuộc về con người.",
      },
      {
        question:
          "Prompt nào tốt hơn khi nhờ AI viết thông báo nghỉ lễ nội bộ?",
        options: [
          "Viết thông báo nghỉ lễ",
          "Viết thông báo nghỉ lễ cho toàn công ty, giọng thân thiện, có ngày nghỉ, ngày làm bù và kênh hỏi đáp",
          "Viết gì cũng được miễn là dài",
          "Tự bịa lịch nghỉ lễ cho công ty",
        ],
        correctIndex: 1,
        explanation:
          "Prompt tốt cần có người đọc, mục tiêu, dữ kiện chính và giọng văn. AI không nên tự bịa thông tin vận hành.",
      },
      {
        question:
          "Bạn có bảng chấm công tháng này và muốn AI tìm bất thường. Bước nào nên làm trước?",
        options: [
          "Ẩn tên/SĐT, giữ mã nhân viên nội bộ và mô tả cột dữ liệu cần kiểm tra",
          "Đưa nguyên file có thông tin cá nhân lên mọi công cụ AI",
          "Yêu cầu AI sửa trực tiếp bảng lương",
          "Bỏ qua bước kiểm tra lại kết quả",
        ],
        correctIndex: 0,
        explanation:
          "Với dữ liệu nhân sự, hãy giảm dữ liệu nhạy cảm trước. AI chỉ nên hỗ trợ phát hiện mẫu bất thường, không thay quy trình phê duyệt.",
      },
      {
        question:
          "Khi nhờ AI viết JD tuyển dụng, thông tin nào giúp bản nháp sát nhu cầu hơn?",
        options: [
          "Mục tiêu vị trí, nhiệm vụ chính, kỹ năng bắt buộc và tiêu chí đánh giá",
          "Chỉ tên vị trí",
          "Dữ liệu cá nhân của ứng viên cũ",
          "Yêu cầu AI sao chép JD đối thủ",
        ],
        correctIndex: 0,
        explanation:
          "JD cần dữ kiện rõ về công việc và tiêu chí. AI chỉ nên tạo bản nháp để HR chỉnh lại theo nhu cầu thật.",
      },
      {
        question:
          "AI tóm tắt khảo sát nhân viên thành nhiều nhận định tiêu cực. HR nên làm gì trước khi báo cáo?",
        options: [
          "Kiểm tra mẫu phản hồi, nhóm chủ đề và tránh lộ danh tính người góp ý",
          "Công khai từng phản hồi kèm tên",
          "Kết luận ngay rằng phòng ban có vấn đề",
          "Xóa phản hồi trái chiều",
        ],
        correctIndex: 0,
        explanation:
          "Phản hồi nhân viên cần bảo mật và phân tích cẩn trọng. AI hỗ trợ nhóm ý, còn HR kiểm chứng bối cảnh.",
      },
      {
        question:
          "Bạn muốn AI soạn checklist onboarding ngày đầu. Mục nào nên có?",
        options: [
          "Tài khoản cần tạo, người phụ trách, tài liệu cần đọc và mốc hoàn thành",
          "Thông tin lương của toàn phòng",
          "Mật khẩu dùng chung",
          "Danh sách đánh giá cá nhân bí mật",
        ],
        correctIndex: 0,
        explanation:
          "Checklist onboarding cần rõ trách nhiệm và mốc thời gian, không cần đưa dữ liệu nhạy cảm không liên quan.",
      },
      {
        question:
          "Khi AI gợi ý câu hỏi phỏng vấn, nguyên tắc nào cần giữ?",
        options: [
          "Câu hỏi bám năng lực công việc, tránh tuổi, giới tính, tình trạng hôn nhân",
          "Hỏi càng riêng tư càng hiểu ứng viên",
          "Để AI quyết định ứng viên trúng tuyển",
          "Chỉ hỏi theo cảm tính",
        ],
        correctIndex: 0,
        explanation:
          "Phỏng vấn cần công bằng và bám tiêu chí công việc. AI có thể gợi ý câu hỏi nhưng HR phải kiểm tra thiên kiến.",
      },
      {
        question:
          "Bạn dùng AI soạn kế hoạch đào tạo nội bộ. Đầu ra nào dễ triển khai nhất?",
        options: [
          "Mục tiêu học, agenda, bài tập thực hành, cách đo kết quả và tài liệu cần chuẩn bị",
          "Một đoạn truyền cảm hứng chung chung",
          "Slide tự động xuất bản không cần duyệt",
          "Danh sách công cụ AI thật dài",
        ],
        correctIndex: 0,
        explanation:
          "Đào tạo hiệu quả cần mục tiêu đo được, hoạt động cụ thể và cách đánh giá sau học.",
      },
      {
        question:
          "Khi AI đề xuất một chính sách nghỉ phép mới, bước nào bắt buộc?",
        options: [
          "Đối chiếu luật, chính sách hiện hành và để người có thẩm quyền duyệt",
          "Ban hành ngay vì AI viết mạch lạc",
          "Sao chép nguyên chính sách công ty khác",
          "Không cần thông báo cho nhân viên",
        ],
        correctIndex: 0,
        explanation:
          "Chính sách nhân sự có ràng buộc pháp lý và vận hành. AI chỉ tạo bản nháp, không thay quy trình phê duyệt.",
      },
    ],
  },
  {
    id: "ai-ban-hang",
    title: "AI hỗ trợ bán hàng hiệu quả",
    description:
      "Bộ đề thực hành để luyện tìm khách, soạn nội dung và chăm sóc khách hàng bằng AI.",
    category: "Kinh doanh",
    creator: "AI Trợ Lý",
    difficulty: "Trung bình",
    xp: 80,
    publishedOrder: 7,
    theme: "sales",
    roleId: "kinh-doanh",
    durationMinutes: 20,
    questions: [
      {
        question:
          "Bạn muốn AI viết email chào khách doanh nghiệp mới. Prompt nào dễ ra kết quả dùng được nhất?",
        options: [
          "Viết email bán hàng thật hay",
          "Bạn là sales B2B. Viết email 120 từ cho khách vừa mở chi nhánh, nêu 2 lợi ích và mời gọi lịch 15 phút",
          "Tự bịa tên khách và cam kết giảm giá",
          "Viết càng dài càng tốt",
        ],
        correctIndex: 1,
        explanation:
          "Prompt có vai trò, ngữ cảnh, độ dài, lợi ích và hành động tiếp theo sẽ cho bản nháp sát mục tiêu hơn.",
      },
      {
        question:
          "Khách nói: 'Để anh/chị suy nghĩ thêm'. Bạn nên nhờ AI hỗ trợ theo cách nào?",
        options: [
          "Tạo 3 cách phản hồi lịch sự để làm rõ băn khoăn và đề xuất bước tiếp theo",
          "Ép khách mua ngay bằng lời hứa không có thật",
          "Tự động gửi tin nhắn cho khách mà không đọc",
          "Đưa toàn bộ thông tin cá nhân của khách lên AI công cộng",
        ],
        correctIndex: 0,
        explanation:
          "AI hữu ích ở bước tạo phương án phản hồi. Sales vẫn cần kiểm tra giọng điệu, dữ kiện và bảo mật thông tin khách.",
      },
      {
        question:
          "Bạn muốn phân tích ghi chú CRM bằng AI. Dữ liệu nào nên loại bỏ trước?",
        options: [
          "Tên riêng, số điện thoại, email và thông tin hợp đồng nhạy cảm",
          "Mục tiêu phân tích",
          "Loại khách hàng ở mức tổng quát",
          "Các câu hỏi cần AI trả lời",
        ],
        correctIndex: 0,
        explanation:
          "Nên ẩn dữ liệu định danh và hợp đồng nhạy cảm. Vẫn giữ bối cảnh tổng quát để AI phân tích đúng việc.",
      },
      {
        question:
          "AI đóng vai khách khó tính hữu ích nhất trong tình huống nào?",
        options: [
          "Luyện phản xạ xử lý từ chối trước cuộc gọi thật",
          "Thay sales gọi điện cho khách",
          "Đảm bảo chốt 100% đơn hàng",
          "Tự quyết định mức chiết khấu cuối cùng",
        ],
        correctIndex: 0,
        explanation:
          "Role-play giúp luyện phản xạ và chuẩn bị kịch bản, nhưng kết quả kinh doanh vẫn phụ thuộc vào con người và tình huống thật.",
      },
      {
        question:
          "Bạn muốn AI phân nhóm khách hàng từ ghi chú CRM. Cách yêu cầu nào tốt nhất?",
        options: [
          "Ẩn định danh, nêu tiêu chí phân nhóm và yêu cầu bảng gồm nhu cầu, mức quan tâm, bước tiếp theo",
          "Dán toàn bộ dữ liệu khách kèm số điện thoại",
          "Yêu cầu AI đoán thu nhập cá nhân của khách",
          "Chỉ hỏi 'khách nào ngon?'",
        ],
        correctIndex: 0,
        explanation:
          "Phân nhóm bằng AI cần tiêu chí rõ và dữ liệu đã giảm nhạy cảm. Không nên yêu cầu AI suy đoán thông tin cá nhân.",
      },
      {
        question:
          "Sau buổi demo sản phẩm, AI hỗ trợ việc nào hiệu quả nhất?",
        options: [
          "Soạn bản tóm tắt nhu cầu, câu hỏi còn mở và email follow-up để sales chỉnh lại",
          "Tự ký hợp đồng với khách",
          "Tự quyết định mức giảm giá",
          "Gửi email cho khách mà không cần kiểm tra",
        ],
        correctIndex: 0,
        explanation:
          "AI giúp tạo bản nháp và tóm tắt nhanh. Sales vẫn cần kiểm tra thông tin, giá và cam kết trước khi gửi.",
      },
      {
        question:
          "AI gợi ý một claim 'sản phẩm tăng doanh thu 300%' nhưng công ty chưa có số liệu. Bạn nên làm gì?",
        options: [
          "Dùng ngay để email hấp dẫn hơn",
          "Bỏ claim hoặc thay bằng lợi ích đã có bằng chứng",
          "Nói là số liệu nội bộ bí mật",
          "Phóng đại thêm cho nổi bật",
        ],
        correctIndex: 1,
        explanation:
          "Sales không nên dùng claim chưa có bằng chứng. AI có thể tạo câu thuyết phục nhưng dữ kiện phải đúng.",
      },
      {
        question:
          "Prompt nào giúp AI viết kịch bản gọi lại khách cũ tốt hơn?",
        options: [
          "Bạn là sales B2B, viết kịch bản gọi 90 giây cho khách từng dùng thử, mục tiêu hỏi trải nghiệm và hẹn demo nâng cấp",
          "Gọi khách cũ đi",
          "Ép khách mua lại",
          "Tự bịa lịch sử giao dịch",
        ],
        correctIndex: 0,
        explanation:
          "Prompt tốt nêu vai trò, đối tượng, thời lượng, mục tiêu và ngữ cảnh. Không để AI bịa lịch sử khách hàng.",
      },
      {
        question:
          "Khi AI tạo bảng so sánh sản phẩm mình với đối thủ, điều nào cần kiểm tra kỹ?",
        options: [
          "Tính đúng của thông tin đối thủ, ưu nhược điểm và nguồn dữ liệu",
          "Bảng có nhiều màu hay không",
          "AI dùng từ mạnh mẽ",
          "Bảng dài hơn đối thủ",
        ],
        correctIndex: 0,
        explanation:
          "So sánh cạnh tranh cần chính xác và công bằng. Thông tin sai có thể làm mất uy tín với khách.",
      },
      {
        question:
          "Bạn muốn đo hiệu quả dùng AI trong sales. Chỉ số nào thực tế hơn?",
        options: [
          "Thời gian soạn email giảm, tỷ lệ phản hồi và số follow-up được cá nhân hóa",
          "Số chữ AI viết ra",
          "Số lần đổi công cụ AI",
          "AI trả lời có vẻ tự tin",
        ],
        correctIndex: 0,
        explanation:
          "Hiệu quả sales nên đo bằng thời gian tiết kiệm và chất lượng tương tác với khách, không phải độ dài output AI.",
      },
    ],
  },
  {
    id: "ai-marketing",
    title: "AI trong Marketing hiện đại",
    description:
      "Bộ đề thực hành để luyện lên ý tưởng, tối ưu nội dung và bảo vệ dữ liệu chiến dịch.",
    category: "Marketing",
    creator: "AI Trợ Lý",
    difficulty: "Khó",
    xp: 100,
    publishedOrder: 6,
    theme: "marketing",
    roleId: "marketing",
    durationMinutes: 25,
    questions: [
      {
        question:
          "Bạn muốn AI lên 10 ý tưởng bài đăng cho chiến dịch mới. Dữ kiện nào nên có trong prompt?",
        options: [
          "Tên chiến dịch, chân dung khách hàng, kênh đăng, giọng thương hiệu và CTA",
          "Chỉ ghi 'viết content viral'",
          "Bắt AI sao chép nguyên nội dung đối thủ",
          "Không cần mục tiêu vì AI sẽ tự biết",
        ],
        correctIndex: 0,
        explanation:
          "Marketing cần bối cảnh rõ: mục tiêu, audience, kênh, voice và hành động mong muốn. AI không tự hiểu brand nếu không được cung cấp.",
      },
      {
        question:
          "AI đề xuất một số liệu thị trường rất thuyết phục nhưng không có nguồn. Bạn nên làm gì?",
        options: [
          "Dùng ngay vì nghe có vẻ chuyên nghiệp",
          "Yêu cầu nguồn, tự kiểm chứng bằng dữ liệu đáng tin cậy rồi mới dùng",
          "Phóng đại thêm cho hấp dẫn",
          "Đưa vào báo cáo khách hàng mà không chú thích",
        ],
        correctIndex: 1,
        explanation:
          "AI có thể bịa số liệu. Với báo cáo marketing, số liệu và nguồn phải được kiểm chứng trước khi xuất bản.",
      },
      {
        question:
          "Khi nhờ AI phân tích phản hồi khách hàng, cách nào giảm rủi ro dữ liệu?",
        options: [
          "Ẩn tên, email, số điện thoại và chỉ giữ nội dung phản hồi đã được tổng hợp",
          "Dán nguyên file xuất từ CRM",
          "Đưa cả lịch sử mua hàng cá nhân lên công cụ công cộng",
          "Không cần kiểm tra vì dữ liệu marketing không nhạy cảm",
        ],
        correctIndex: 0,
        explanation:
          "Phản hồi khách hàng vẫn có thể chứa dữ liệu cá nhân. Hãy tổng hợp hoặc ẩn định danh trước khi dùng AI.",
      },
      {
        question:
          "AI phù hợp nhất ở bước nào trong quy trình content?",
        options: [
          "Sinh bản nháp, gợi ý góc nhìn và biến thể tiêu đề để marketer chọn lọc",
          "Tự quyết định toàn bộ chiến lược thương hiệu",
          "Đăng bài tự động không qua duyệt",
          "Cam kết mọi bài viết đều viral",
        ],
        correctIndex: 0,
        explanation:
          "AI giúp tăng tốc ideation và bản nháp. Chiến lược, kiểm duyệt brand voice và quyết định cuối vẫn cần marketer.",
      },
      {
        question:
          "Bạn muốn AI lập kế hoạch nội dung tháng. Prompt nên có gì?",
        options: [
          "Mục tiêu chiến dịch, khách hàng mục tiêu, kênh, trụ cột nội dung, số bài và CTA",
          "Lên content tháng này",
          "Tự đoán toàn bộ sản phẩm",
          "Sao chép lịch đăng của đối thủ",
        ],
        correctIndex: 0,
        explanation:
          "Content plan cần dữ kiện chiến dịch rõ. AI càng có bối cảnh, lịch gợi ý càng sát việc thật.",
      },
      {
        question:
          "Khi nhờ AI tạo brief hình ảnh quảng cáo, thông tin nào quan trọng?",
        options: [
          "Thông điệp chính, đối tượng, kênh đăng, phong cách, kích thước và điều cần tránh",
          "Chỉ yêu cầu ảnh đẹp",
          "Bắt AI dùng logo đối thủ",
          "Không cần mô tả người xem",
        ],
        correctIndex: 0,
        explanation:
          "Visual brief tốt cần mục tiêu truyền thông, ràng buộc kênh và phong cách. Không dùng tài sản thương hiệu của bên khác.",
      },
      {
        question:
          "AI viết caption có claim 'cam kết hiệu quả sau 7 ngày' nhưng sản phẩm chưa có cam kết này. Bạn nên?",
        options: [
          "Đăng ngay vì câu nghe mạnh",
          "Sửa lại theo claim đã được công ty phê duyệt",
          "Ẩn claim ở cuối bài",
          "Tăng thành 3 ngày cho hấp dẫn",
        ],
        correctIndex: 1,
        explanation:
          "Claim marketing phải đúng và được phê duyệt. AI có thể viết quá đà nếu không có ràng buộc rõ.",
      },
      {
        question:
          "Bạn dùng AI phân tích báo cáo chiến dịch. Đâu là yêu cầu tốt?",
        options: [
          "Chỉ dùng dữ liệu trong bảng, chỉ ra chỉ số tốt/kém và đề xuất 3 hành động có lý do",
          "Tự bịa benchmark ngành",
          "Kết luận chiến dịch thành công dù thiếu dữ liệu",
          "Chỉ viết lại số liệu",
        ],
        correctIndex: 0,
        explanation:
          "Phân tích tốt cần bám dữ liệu đã cung cấp và tách rõ đề xuất khỏi giả định chưa kiểm chứng.",
      },
      {
        question:
          "AI tạo 20 ý tưởng nội dung. Bước tiếp theo nên là gì?",
        options: [
          "Chọn lọc theo mục tiêu, giọng thương hiệu, nguồn lực sản xuất và rủi ro pháp lý",
          "Đăng cả 20 ý tưởng ngay",
          "Chọn ý tưởng dài nhất",
          "Bỏ qua kiểm tra brand voice",
        ],
        correctIndex: 0,
        explanation:
          "AI giúp tăng số lượng ý tưởng, nhưng marketer phải chọn lọc theo chiến lược, brand voice và khả năng thực thi.",
      },
      {
        question:
          "Khi tái sử dụng bài blog thành nhiều kênh, điều nào cần giữ nhất quán?",
        options: [
          "Thông điệp chính, dữ kiện quan trọng và CTA",
          "Độ dài y hệt nhau trên mọi kênh",
          "Hashtag giống nhau cho email",
          "Tất cả câu chữ phải giữ nguyên",
        ],
        correctIndex: 0,
        explanation:
          "Mỗi kênh có định dạng riêng, nhưng thông điệp chính và CTA cần nhất quán để không lệch chiến dịch.",
      },
    ],
  },
  {
    id: "ai-ke-toan",
    title: "AI an toàn cho công việc kế toán",
    description:
      "Bộ đề thực hành để luyện nhận diện rủi ro, kiểm tra số liệu và dùng AI đúng cách trong nghiệp vụ.",
    category: "Kế toán",
    creator: "AI Trợ Lý",
    difficulty: "Trung bình",
    xp: 80,
    publishedOrder: 5,
    theme: "accounting",
    roleId: "ke-toan",
    durationMinutes: 15,
    questions: [
      {
        question:
          "Bạn muốn AI hỗ trợ kiểm tra mô tả chi phí trong bảng tính. Cách nào an toàn hơn?",
        options: [
          "Ẩn mã số thuế, số tài khoản và dữ liệu nhạy cảm rồi hỏi AI tìm nhóm chi phí bất thường",
          "Upload toàn bộ sổ cái có thông tin khách hàng",
          "Nhờ AI tự sửa số tiền sai",
          "Dùng kết quả AI thay chứng từ gốc",
        ],
        correctIndex: 0,
        explanation:
          "Dữ liệu kế toán nhạy cảm. AI nên hỗ trợ phân loại và gợi ý điểm cần kiểm tra, không thay chứng từ hay phê duyệt nghiệp vụ.",
      },
      {
        question:
          "AI trả lời rằng một khoản chi 'chắc chắn hợp lệ'. Kế toán nên hiểu thế nào?",
        options: [
          "AI là nguồn xác nhận cuối cùng",
          "Đó chỉ là gợi ý, cần đối chiếu quy định, chứng từ và chính sách nội bộ",
          "Có thể bỏ qua kiểm tra chứng từ",
          "Nên tự động đưa vào báo cáo",
        ],
        correctIndex: 1,
        explanation:
          "AI không phải chuẩn mực kế toán hay pháp lý. Kết quả phải được kiểm chứng bằng nguồn chính thức và chứng từ thật.",
      },
      {
        question:
          "Prompt nào phù hợp khi nhờ AI giải thích một công thức Excel?",
        options: [
          "Giải thích công thức này theo từng phần, nêu rủi ro lỗi và ví dụ nhỏ: [công thức đã ẩn dữ liệu nhạy cảm]",
          "Sửa toàn bộ báo cáo tài chính cho tôi",
          "Tự đoán công thức trong file chưa gửi",
          "Bỏ qua lỗi vì AI sẽ đúng",
        ],
        correctIndex: 0,
        explanation:
          "AI có thể giải thích logic công thức rất tốt nếu có dữ kiện vừa đủ. Không nên giao toàn bộ báo cáo nhạy cảm cho AI công cộng.",
      },
      {
        question:
          "Việc nào AI hỗ trợ kế toán tốt nhất ở cấp độ nhân viên?",
        options: [
          "Tạo checklist kiểm tra, giải thích công thức và gợi ý điểm bất thường",
          "Ký duyệt báo cáo thay người phụ trách",
          "Tự nộp tờ khai thuế",
          "Cam kết không bao giờ sai số",
        ],
        correctIndex: 0,
        explanation:
          "AI mạnh ở hỗ trợ đọc, phân loại, checklist và giải thích. Các bước chịu trách nhiệm nghiệp vụ vẫn cần người có thẩm quyền.",
      },
      {
        question:
          "Bạn muốn AI tìm khoản chi bất thường trong bảng 6 tháng. Prompt nào an toàn hơn?",
        options: [
          "Dùng dữ liệu đã ẩn danh, yêu cầu so sánh theo tháng và giải thích khoản lệch lớn",
          "Upload file đầy đủ số tài khoản và mã số thuế",
          "Yêu cầu AI kết luận gian lận ngay",
          "Bỏ qua mô tả cột dữ liệu",
        ],
        correctIndex: 0,
        explanation:
          "AI có thể hỗ trợ phát hiện mẫu lệch, nhưng dữ liệu cần ẩn danh và kết luận phải được kiểm chứng bằng chứng từ.",
      },
      {
        question:
          "Khi AI viết công thức Excel, bước kiểm tra nào nên làm?",
        options: [
          "Test với vài dòng dữ liệu mẫu đã biết kết quả trước khi áp dụng toàn bảng",
          "Áp dụng ngay cho file báo cáo chính",
          "Xóa công thức cũ không lưu bản sao",
          "Không cần đọc giải thích",
        ],
        correctIndex: 0,
        explanation:
          "Kiểm thử trên dữ liệu mẫu giúp phát hiện lỗi công thức trước khi ảnh hưởng báo cáo thật.",
      },
      {
        question:
          "AI soạn email nhắc công nợ. Thông tin nào bắt buộc tự đối chiếu?",
        options: [
          "Số tiền, hạn thanh toán, tên khách và điều khoản nhắc nợ",
          "Màu chữ email",
          "Độ dài câu chào",
          "Tên công cụ AI",
        ],
        correctIndex: 0,
        explanation:
          "Email công nợ có ràng buộc tài chính và quan hệ khách hàng, nên số tiền và điều khoản phải đúng tuyệt đối.",
      },
      {
        question:
          "Bạn muốn AI tóm tắt báo cáo quản trị. Điều nào cần cấm trong prompt?",
        options: [
          "Tự bịa số liệu hoặc nguyên nhân nếu bảng dữ liệu không có",
          "Chỉ dùng dữ liệu đã cung cấp",
          "Nêu điểm bất thường cần kiểm tra",
          "Tách nhận định khỏi số liệu",
        ],
        correctIndex: 0,
        explanation:
          "AI có thể bịa nếu không bị ràng buộc. Với báo cáo quản trị, chỉ dùng dữ liệu được cung cấp và nêu rõ phần cần kiểm chứng.",
      },
      {
        question:
          "Khi trích xuất thông tin từ PDF chứng từ bằng AI, việc nào vẫn phải làm thủ công?",
        options: [
          "Đối chiếu lại với chứng từ gốc trước khi nhập sổ",
          "Tin mọi dòng trích xuất",
          "Xóa file gốc",
          "Tự tạo mã hóa đơn mới",
        ],
        correctIndex: 0,
        explanation:
          "OCR/AI có thể đọc sai số hoặc ngày. Kế toán phải đối chiếu với chứng từ gốc trước khi ghi nhận.",
      },
      {
        question:
          "AI phù hợp nhất khi kế toán cần giải thích chênh lệch kỳ này/kỳ trước như thế nào?",
        options: [
          "Gợi ý nhóm nguyên nhân có thể kiểm tra và câu hỏi cần hỏi thêm",
          "Kết luận chắc chắn nguyên nhân dù thiếu chứng từ",
          "Tự sửa số liệu kỳ trước",
          "Bỏ qua các khoản bất thường",
        ],
        correctIndex: 0,
        explanation:
          "AI nên hỗ trợ tạo giả thuyết và checklist kiểm tra. Nguyên nhân cuối cùng phải dựa trên dữ liệu và chứng từ.",
      },
    ],
  },
  {
    id: "ai-van-phong",
    title: "Tổng hợp kiến thức AI văn phòng",
    description:
      "Bộ đề thực hành dành cho nhân viên văn phòng muốn bắt đầu dùng AI an toàn.",
    category: "Văn phòng",
    creator: "AI Trợ Lý",
    difficulty: "Dễ",
    xp: 60,
    publishedOrder: 4,
    theme: "office",
    roleId: "khac",
    durationMinutes: 30,
    questions: [
      {
        question:
          "Một prompt cơ bản nên có những thành phần nào?",
        options: [
          "Vai trò, bối cảnh, nhiệm vụ, định dạng đầu ra và tiêu chí kiểm tra",
          "Chỉ cần viết một từ khóa",
          "Càng mơ hồ càng sáng tạo",
          "Không cần nói mục tiêu",
        ],
        correctIndex: 0,
        explanation:
          "Prompt rõ giúp AI hiểu việc cần làm và trả kết quả dễ dùng hơn. Đây là kỹ năng nền tảng cho mọi vai trò.",
      },
      {
        question:
          "Khi AI trả lời rất tự tin về một chính sách công ty mà bạn chưa cung cấp, bạn nên làm gì?",
        options: [
          "Tin ngay vì AI nói chắc chắn",
          "Kiểm tra lại với tài liệu nội bộ hoặc người phụ trách trước khi dùng",
          "Gửi cho toàn công ty luôn",
          "Yêu cầu AI ký tên thay quản lý",
        ],
        correctIndex: 1,
        explanation:
          "AI có thể trả lời tự tin nhưng sai. Thông tin nội bộ cần được kiểm chứng bằng nguồn thật.",
      },
      {
        question:
          "Bạn muốn AI tóm tắt biên bản họp. Cách đặt yêu cầu nào hữu ích hơn?",
        options: [
          "Tóm tắt thành 5 ý chính, danh sách việc cần làm, người phụ trách và deadline nếu có",
          "Tóm tắt đi",
          "Tự bịa thêm deadline",
          "Xóa hết bối cảnh cuộc họp",
        ],
        correctIndex: 0,
        explanation:
          "Kết quả tóm tắt hữu ích hơn khi bạn nói rõ cấu trúc đầu ra cần nhận.",
      },
      {
        question:
          "Thông tin nào không nên đưa nguyên văn vào công cụ AI công cộng?",
        options: [
          "Dữ liệu cá nhân, hợp đồng, thông tin tài chính và bí mật nội bộ",
          "Một yêu cầu đã ẩn danh",
          "Một ví dụ giả lập",
          "Một câu hỏi chung về kỹ năng",
        ],
        correctIndex: 0,
        explanation:
          "Nguyên tắc an toàn là không đưa dữ liệu nhạy cảm vào công cụ công cộng nếu chưa có quy định và quyền phù hợp.",
      },
      {
        question:
          "Bạn muốn AI viết email nhắc deadline cho team. Prompt nào phù hợp?",
        options: [
          "Viết email ngắn, lịch sự, nhắc deadline [ngày], nêu việc cần hoàn thành và kênh phản hồi",
          "Nhắc deadline đi",
          "Tự bịa lỗi của từng người",
          "Viết càng căng thẳng càng tốt",
        ],
        correctIndex: 0,
        explanation:
          "Email công việc nên rõ deadline, hành động cần làm và giọng phù hợp. Không để AI bịa lỗi cá nhân.",
      },
      {
        question:
          "Khi AI lập checklist tuần, tiêu chí nào giúp checklist dùng được?",
        options: [
          "Có mức ưu tiên, deadline, người phụ trách và đầu ra mong muốn",
          "Chỉ liệt kê thật nhiều việc",
          "Không cần thứ tự",
          "Không cần mục tiêu",
        ],
        correctIndex: 0,
        explanation:
          "Checklist tốt phải giúp hành động được: ưu tiên rõ, thời hạn rõ và biết ai chịu trách nhiệm.",
      },
      {
        question:
          "AI đề xuất một quy trình nội bộ mới. Bạn nên làm gì trước khi áp dụng?",
        options: [
          "Nhờ người phụ trách nghiệp vụ rà soát và thử nhỏ trước",
          "Áp dụng ngay cho toàn công ty",
          "Xóa quy trình cũ lập tức",
          "Không thông báo cho ai",
        ],
        correctIndex: 0,
        explanation:
          "Quy trình ảnh hưởng nhiều người nên cần duyệt nghiệp vụ và thử nghiệm nhỏ trước khi triển khai rộng.",
      },
      {
        question:
          "Khi dùng AI soạn nội dung từ tài liệu công ty, điều nào cần kiểm tra?",
        options: [
          "AI có thêm thông tin ngoài tài liệu gốc hay không",
          "AI viết nhanh hay chậm",
          "Câu trả lời có dài không",
          "AI dùng nhiều từ tiếng Anh",
        ],
        correctIndex: 0,
        explanation:
          "AI có thể tự thêm thông tin nghe hợp lý nhưng không có trong tài liệu. Cần kiểm tra để tránh truyền sai nội bộ.",
      },
      {
        question:
          "Bạn muốn AI so sánh 3 công cụ làm việc. Đầu ra nào dễ quyết định nhất?",
        options: [
          "Bảng so sánh theo chi phí, tính năng, rủi ro dữ liệu, độ dễ dùng và khuyến nghị",
          "Một đoạn khen công cụ nổi tiếng nhất",
          "Danh sách link không có nhận xét",
          "Chọn ngẫu nhiên một công cụ",
        ],
        correctIndex: 0,
        explanation:
          "So sánh theo tiêu chí giúp quyết định minh bạch hơn, đặc biệt với chi phí và rủi ro dữ liệu.",
      },
      {
        question:
          "Nếu AI trả lời sai nhưng giọng rất tự tin, bài học quan trọng là gì?",
        options: [
          "Luôn kiểm chứng thông tin quan trọng bằng nguồn đáng tin cậy",
          "AI tự tin nghĩa là đúng",
          "Không bao giờ dùng AI nữa",
          "Chỉ dùng câu trả lời dài nhất",
        ],
        correctIndex: 0,
        explanation:
          "AI có thể sai trong giọng rất chắc chắn. Người dùng cần kiểm chứng thông tin quan trọng trước khi áp dụng.",
      },
    ],
  },
];

const EXTRA_AVAILABLE_QUIZZES: HocTapPlayableQuizSeed[] = [
  {
    id: "prompt-engineering",
    title: "Prompt Engineering cơ bản",
    description:
      "Học cách viết yêu cầu rõ ràng để nhận kết quả sát mục tiêu hơn từ các công cụ AI.",
    category: "Prompt",
    creator: "AI Trợ Lý",
    difficulty: "Trung bình",
    xp: 70,
    publishedOrder: 3,
    theme: "prompt",
    roleId: "khac",
    durationMinutes: 20,
    questions: [
      {
        question: "Một prompt cơ bản nên bắt đầu bằng thông tin nào?",
        options: [
          "Vai trò/ngữ cảnh của AI và mục tiêu cần đạt",
          "Một từ khóa thật ngắn",
          "Mật khẩu tài khoản làm việc",
          "Câu càng mơ hồ càng tốt",
        ],
        correctIndex: 0,
        explanation:
          "Prompt tốt thường có vai trò, bối cảnh, nhiệm vụ, dữ liệu đầu vào và định dạng đầu ra.",
      },
      {
        question:
          "Bạn cần AI trả về bảng so sánh. Phần nào nên ghi rõ trong prompt?",
        options: [
          "Các cột cần có, tiêu chí so sánh và định dạng bảng",
          "Chỉ ghi 'so sánh giúp tôi'",
          "Yêu cầu AI tự đoán dữ liệu chưa có",
          "Không cần nói đầu ra",
        ],
        correctIndex: 0,
        explanation:
          "Nói rõ định dạng đầu ra giúp AI trả kết quả dễ copy, dễ kiểm tra và ít phải sửa lại.",
      },
      {
        question:
          "Khi prompt đầu tiên cho kết quả quá chung, bước sửa tốt nhất là gì?",
        options: [
          "Bổ sung bối cảnh, ví dụ, ràng buộc và tiêu chí đánh giá",
          "Gõ lại đúng câu cũ nhiều lần",
          "Chọn kết quả dài nhất",
          "Bỏ qua mục tiêu ban đầu",
        ],
        correctIndex: 0,
        explanation:
          "Prompt là quá trình lặp. Càng thêm context và tiêu chí rõ, kết quả càng sát việc thật.",
      },
      {
        question:
          "Yêu cầu nào giúp AI tránh bịa dữ kiện khi viết báo cáo?",
        options: [
          "Chỉ sử dụng dữ liệu tôi cung cấp; phần thiếu hãy ghi 'chưa đủ dữ liệu'",
          "Tự thêm số liệu cho thuyết phục",
          "Viết tự tin dù thiếu nguồn",
          "Không cần phân biệt dữ liệu thật và giả định",
        ],
        correctIndex: 0,
        explanation:
          "Với báo cáo, phải ràng buộc AI chỉ dùng dữ liệu có thật và nêu rõ phần chưa đủ thông tin.",
      },
      {
        question:
          "Prompt nào phù hợp khi muốn AI đóng vai người phản biện?",
        options: [
          "Đóng vai reviewer, chỉ ra 5 rủi ro trong kế hoạch này và đề xuất cách kiểm chứng",
          "Khen kế hoạch này",
          "Viết lại cho dài hơn",
          "Bỏ qua điểm yếu",
        ],
        correctIndex: 0,
        explanation:
          "Role phản biện giúp AI tìm lỗ hổng, nhưng cần mục tiêu rõ và yêu cầu cách kiểm chứng.",
      },
      {
        question:
          "Khi dùng prompt template cho công việc lặp lại, phần nào nên để trong ngoặc để thay mỗi lần?",
        options: [
          "Tên khách, sản phẩm, deadline, số liệu hoặc bối cảnh riêng của lần đó",
          "Toàn bộ hướng dẫn cố định",
          "Mật khẩu hệ thống",
          "Không để phần nào thay đổi",
        ],
        correctIndex: 0,
        explanation:
          "Template tốt giữ cấu trúc cố định và chỉ thay các biến như đối tượng, dữ liệu, thời hạn.",
      },
      {
        question:
          "Bạn muốn AI viết ngắn gọn hơn. Câu nào nên thêm vào prompt?",
        options: [
          "Trả lời tối đa 120 từ, dùng bullet, ưu tiên hành động cụ thể",
          "Viết càng dài càng tốt",
          "Không cần cấu trúc",
          "Dùng thật nhiều thuật ngữ",
        ],
        correctIndex: 0,
        explanation:
          "Giới hạn độ dài và định dạng giúp đầu ra đúng nhu cầu sử dụng hơn.",
      },
      {
        question:
          "Khi đưa ví dụ mẫu vào prompt, mục đích chính là gì?",
        options: [
          "Giúp AI học phong cách, cấu trúc và mức chi tiết mong muốn",
          "Để AI sao chép nguyên văn mọi lúc",
          "Thay thế dữ liệu thật cần kiểm tra",
          "Làm prompt dài cho chuyên nghiệp",
        ],
        correctIndex: 0,
        explanation:
          "Ví dụ mẫu giúp AI bắt đúng style và cấu trúc. Vẫn cần kiểm tra dữ kiện trong câu trả lời mới.",
      },
      {
        question:
          "Dữ liệu nào không nên đặt trực tiếp trong prompt gửi công cụ công cộng?",
        options: [
          "Thông tin cá nhân, hợp đồng, lương, số tài khoản và bí mật nội bộ",
          "Một tình huống giả lập đã ẩn danh",
          "Yêu cầu định dạng đầu ra",
          "Một câu hỏi kiến thức chung",
        ],
        correctIndex: 0,
        explanation:
          "An toàn dữ liệu là nguyên tắc nền tảng khi viết prompt trong môi trường công cộng.",
      },
      {
        question:
          "Sau khi AI trả lời, thói quen nào giúp dùng prompt hiệu quả hơn?",
        options: [
          "Đọc lại, kiểm chứng phần quan trọng và yêu cầu chỉnh theo tiêu chí cụ thể",
          "Copy ngay mọi câu trả lời",
          "Không bao giờ hỏi tiếp",
          "Chỉ tin câu trả lời có giọng tự tin",
        ],
        correctIndex: 0,
        explanation:
          "Kết quả AI là bản nháp. Người dùng cần kiểm tra và điều chỉnh bằng follow-up prompt rõ ràng.",
      },
    ],
  },
  {
    id: "phan-tich-du-lieu",
    title: "Phân tích dữ liệu với AI",
    description:
      "Khám phá cách đặt câu hỏi, đọc kết quả và kiểm tra độ tin cậy khi phân tích dữ liệu.",
    category: "Dữ liệu",
    creator: "AI Trợ Lý",
    difficulty: "Dễ",
    xp: 50,
    publishedOrder: 2,
    theme: "data",
    roleId: "khac",
    durationMinutes: 25,
    questions: [
      {
        question:
          "Trước khi nhờ AI phân tích một bảng dữ liệu, bước nào quan trọng nhất?",
        options: [
          "Mô tả ý nghĩa từng cột, mục tiêu phân tích và kiểm tra dữ liệu nhạy cảm",
          "Dán bảng bất kỳ và hỏi 'có gì hay không'",
          "Bỏ qua giá trị thiếu",
          "Yêu cầu AI tự đoán nguồn dữ liệu",
        ],
        correctIndex: 0,
        explanation:
          "AI cần hiểu cột dữ liệu và mục tiêu phân tích. Đồng thời phải xử lý dữ liệu nhạy cảm trước.",
      },
      {
        question:
          "AI phát hiện một chỉ số tăng mạnh. Bạn nên hiểu kết quả đó như thế nào?",
        options: [
          "Là tín hiệu cần kiểm tra nguyên nhân, không phải kết luận cuối cùng",
          "Chắc chắn do một nguyên nhân duy nhất",
          "Không cần kiểm tra dữ liệu gốc",
          "Có thể công bố ngay",
        ],
        correctIndex: 0,
        explanation:
          "Phân tích dữ liệu cần kiểm chứng: bất thường là điểm cần điều tra thêm, không phải kết luận chắc chắn.",
      },
      {
        question:
          "Khi hỏi AI về dữ liệu bán hàng, prompt nào tốt hơn?",
        options: [
          "Phân tích xu hướng doanh thu theo tháng, chỉ ra tháng bất thường và nêu 3 giả thuyết cần kiểm tra",
          "Bảng này sao?",
          "Tự tìm khách hàng giàu nhất",
          "Viết kết luận tích cực",
        ],
        correctIndex: 0,
        explanation:
          "Câu hỏi tốt nêu rõ chỉ số, chiều phân tích, dạng kết quả và yêu cầu kiểm chứng.",
      },
      {
        question:
          "Điều gì cần làm nếu AI đưa ra biểu đồ hoặc nhận xét nhưng không khớp số liệu gốc?",
        options: [
          "Dừng dùng nhận xét đó và kiểm tra lại cách nhập dữ liệu/công thức",
          "Dùng vì AI thường đúng",
          "Sửa số liệu gốc cho khớp AI",
          "Bỏ qua sai lệch nhỏ",
        ],
        correctIndex: 0,
        explanation:
          "Khi kết quả AI lệch dữ liệu gốc, phải kiểm tra lại dữ liệu và phương pháp, không sửa số liệu để khớp AI.",
      },
      {
        question:
          "Bạn muốn AI phân nhóm phản hồi khách hàng. Dữ liệu nào nên loại bỏ trước?",
        options: [
          "Tên, email, số điện thoại và thông tin định danh không cần thiết",
          "Nội dung phản hồi đã ẩn danh",
          "Mục tiêu phân nhóm",
          "Các nhãn chủ đề cần gợi ý",
        ],
        correctIndex: 0,
        explanation:
          "Phản hồi khách có thể chứa dữ liệu cá nhân. Ẩn danh trước giúp giảm rủi ro khi phân tích.",
      },
      {
        question:
          "Khi dữ liệu có nhiều ô trống, cách nhờ AI phù hợp là gì?",
        options: [
          "Yêu cầu AI liệt kê ô thiếu, đánh giá ảnh hưởng và đề xuất cách xử lý",
          "Tự điền đại cho đủ",
          "Bỏ qua mọi ô trống",
          "Xóa toàn bộ dòng thiếu mà không kiểm tra",
        ],
        correctIndex: 0,
        explanation:
          "Dữ liệu thiếu cần được nhận diện và xử lý có lý do. Không nên để AI tự bịa giá trị.",
      },
      {
        question:
          "AI phù hợp nhất ở bước nào trong phân tích dữ liệu thường ngày?",
        options: [
          "Gợi ý câu hỏi, tóm tắt xu hướng, phát hiện bất thường và tạo checklist kiểm chứng",
          "Thay thế toàn bộ người phân tích",
          "Đảm bảo dữ liệu luôn đúng",
          "Tự quyết định chiến lược công ty",
        ],
        correctIndex: 0,
        explanation:
          "AI giúp tăng tốc phân tích nhưng dữ liệu, ngữ cảnh và quyết định cuối vẫn cần con người kiểm tra.",
      },
      {
        question:
          "Khi yêu cầu AI giải thích một chỉ số, đầu ra nào hữu ích nhất?",
        options: [
          "Định nghĩa ngắn, cách tính, ý nghĩa, ngưỡng cần chú ý và ví dụ trong bảng hiện có",
          "Một đoạn văn chung chung",
          "Chỉ dịch tên chỉ số",
          "Kết luận tốt/xấu không có lý do",
        ],
        correctIndex: 0,
        explanation:
          "Giải thích chỉ số nên có cách tính và ý nghĩa trong bối cảnh dữ liệu thật.",
      },
      {
        question:
          "Muốn AI không vượt quá dữ liệu được cung cấp, bạn nên thêm câu nào?",
        options: [
          "Nếu dữ liệu không đủ, hãy nói rõ chưa đủ dữ liệu thay vì suy đoán",
          "Hãy đoán mạnh dạn",
          "Viết kết luận chắc chắn",
          "Bỏ qua giới hạn dữ liệu",
        ],
        correctIndex: 0,
        explanation:
          "Ràng buộc này giúp giảm ảo giác và làm rõ phần kết luận nào chưa có bằng chứng.",
      },
      {
        question:
          "Khi chia sẻ kết quả phân tích từ AI cho team, điều nào nên kèm theo?",
        options: [
          "Nguồn dữ liệu, giả định, điểm cần kiểm chứng và khuyến nghị hành động",
          "Chỉ kết luận cuối",
          "Câu trả lời raw của AI không chỉnh",
          "Thông tin cá nhân không cần thiết",
        ],
        correctIndex: 0,
        explanation:
          "Kết quả phân tích cần minh bạch về nguồn, giả định và mức độ chắc chắn để team ra quyết định đúng.",
      },
    ],
  },
  {
    id: "ai-automation",
    title: "AI Automation cho doanh nghiệp",
    description:
      "Nhận diện quy trình phù hợp để tự động hóa và những điểm vẫn cần con người kiểm soát.",
    category: "Tự động hóa",
    creator: "AI Trợ Lý",
    difficulty: "Khó",
    xp: 90,
    publishedOrder: 1,
    theme: "automation",
    roleId: "khac",
    durationMinutes: 20,
    questions: [
      {
        question:
          "Quy trình nào phù hợp để bắt đầu tự động hóa bằng AI?",
        options: [
          "Việc lặp lại thường xuyên, có đầu vào/đầu ra rõ và rủi ro thấp",
          "Việc hiếm khi xảy ra và cần phán đoán pháp lý cao",
          "Quyết định sa thải nhân viên",
          "Ký duyệt hợp đồng thay quản lý",
        ],
        correctIndex: 0,
        explanation:
          "Tự động hóa nên bắt đầu từ việc lặp, rõ quy tắc, ít rủi ro để dễ kiểm soát và đo hiệu quả.",
      },
      {
        question:
          "Trước khi automation gửi email tự động ra ngoài, bước nào bắt buộc?",
        options: [
          "Có bước người duyệt hoặc điều kiện kiểm tra cho nội dung nhạy cảm",
          "Gửi thẳng mọi nội dung AI tạo",
          "Bỏ qua log hoạt động",
          "Cho AI tự quyết định người nhận",
        ],
        correctIndex: 0,
        explanation:
          "Nội dung gửi ra ngoài cần kiểm soát chất lượng, người nhận và rủi ro dữ liệu.",
      },
      {
        question:
          "Để mô tả một quy trình cho AI đề xuất automation, bạn nên cung cấp gì?",
        options: [
          "Các bước hiện tại, người phụ trách, công cụ đang dùng, lỗi thường gặp và tiêu chí thành công",
          "Chỉ nói 'tự động hóa giúp tôi'",
          "Mật khẩu phần mềm",
          "Dữ liệu khách hàng thô không ẩn danh",
        ],
        correctIndex: 0,
        explanation:
          "AI cần hiểu quy trình hiện tại và điểm đau để đề xuất automation thực tế, không cần mật khẩu hay dữ liệu nhạy cảm.",
      },
      {
        question:
          "Automation bị lỗi và gửi sai thông tin. Thiết kế nào giúp giảm thiệt hại?",
        options: [
          "Có log, cảnh báo, bước dừng khẩn cấp và người chịu trách nhiệm kiểm tra",
          "Không lưu vết để đơn giản",
          "Chạy ẩn không ai biết",
          "Cho AI tự sửa rồi gửi tiếp",
        ],
        correctIndex: 0,
        explanation:
          "Automation cần khả năng quan sát, rollback/dừng và trách nhiệm rõ để xử lý lỗi nhanh.",
      },
      {
        question:
          "Chỉ số nào đo tốt hiệu quả automation?",
        options: [
          "Thời gian tiết kiệm, số lỗi giảm, số lượt xử lý và tỷ lệ cần can thiệp thủ công",
          "Số công cụ AI đã kết nối",
          "Tên automation nghe hay không",
          "Prompt dài bao nhiêu",
        ],
        correctIndex: 0,
        explanation:
          "Đo automation bằng tác động vận hành thật: tiết kiệm thời gian, giảm lỗi và mức độ ổn định.",
      },
      {
        question:
          "Khi automation dùng dữ liệu từ nhiều hệ thống, rủi ro nào cần chú ý nhất?",
        options: [
          "Quyền truy cập, dữ liệu nhạy cảm, đồng bộ sai và log xử lý",
          "Màu giao diện automation",
          "Tên workflow quá ngắn",
          "Có quá ít icon",
        ],
        correctIndex: 0,
        explanation:
          "Kết nối nhiều hệ thống làm tăng rủi ro bảo mật và sai lệch dữ liệu, nên cần kiểm soát quyền và log.",
      },
      {
        question:
          "Bước thử nghiệm automation an toàn nhất là gì?",
        options: [
          "Chạy thử với dữ liệu mẫu/nhóm nhỏ, kiểm kết quả rồi mới mở rộng",
          "Triển khai toàn công ty ngay",
          "Xóa quy trình thủ công lập tức",
          "Không cần đo kết quả",
        ],
        correctIndex: 0,
        explanation:
          "Pilot nhỏ giúp phát hiện lỗi và đo hiệu quả trước khi automation ảnh hưởng diện rộng.",
      },
      {
        question:
          "Điều nào không nên giao hoàn toàn cho AI automation?",
        options: [
          "Quyết định có tác động pháp lý/tài chính/nhân sự cao mà không có người duyệt",
          "Tạo bản nháp checklist",
          "Tóm tắt email đã ẩn danh",
          "Gắn nhãn ticket theo quy tắc đơn giản",
        ],
        correctIndex: 0,
        explanation:
          "Việc rủi ro cao cần human-in-the-loop. AI automation phù hợp hơn với tác vụ lặp và có kiểm soát.",
      },
      {
        question:
          "Khi viết prompt cho automation xử lý ticket, yếu tố nào quan trọng?",
        options: [
          "Quy tắc phân loại, ví dụ đúng/sai, format output và trường hợp cần chuyển người xử lý",
          "Chỉ yêu cầu 'xử lý ticket'",
          "Cho AI tự đóng mọi ticket",
          "Không cần ví dụ",
        ],
        correctIndex: 0,
        explanation:
          "Automation cần quy tắc và điều kiện chuyển người rõ để tránh xử lý sai các trường hợp nhạy cảm.",
      },
      {
        question:
          "Khi automation chạy tốt, việc tiếp theo nên làm là gì?",
        options: [
          "Viết tài liệu vận hành, owner, cách dừng, cách sửa và lịch kiểm tra định kỳ",
          "Bỏ mặc vì đã tự động",
          "Xóa toàn bộ hướng dẫn",
          "Tăng quyền truy cập tối đa",
        ],
        correctIndex: 0,
        explanation:
          "Automation vẫn cần tài liệu, owner và kiểm tra định kỳ để vận hành ổn định khi quy trình thay đổi.",
      },
    ],
  },
];

const ALL_AVAILABLE_QUIZZES = [...AVAILABLE_QUIZZES, ...EXTRA_AVAILABLE_QUIZZES];

export function isAvailableQuizRoleId(
  value: string,
): value is AvailableQuizRoleId {
  return ROLE_ID_SET.has(value);
}

export function buildHocTapQuizCatalog(): HocTapQuizItem[] {
  return ALL_AVAILABLE_QUIZZES.map(toHocTapQuizItem);
}

export function getHocTapQuiz(quizId: string | null | undefined): HocTapPlayableQuiz | null {
  if (!quizId) return null;
  const quiz = ALL_AVAILABLE_QUIZZES.find((item) => item.id === quizId);
  return quiz ? toPlayableQuiz(quiz) : null;
}

export function resolveHocTapQuizForRoute(
  roleId: string,
  quizId: string | null | undefined,
): HocTapPlayableQuiz | null {
  const byId = getHocTapQuiz(quizId);
  if (byId) return byId.roleId === roleId ? byId : null;
  if (!isAvailableQuizRoleId(roleId)) return null;
  const byRole = ALL_AVAILABLE_QUIZZES.find((item) => item.roleId === roleId);
  return byRole ? toPlayableQuiz(byRole) : null;
}

export function filterHocTapQuizCatalog(
  catalog: HocTapQuizItem[],
  filter: HocTapQuizFilter,
): HocTapQuizItem[] {
  const departmentId = parseHocTapDepartmentFilter(filter);
  if (departmentId) return catalog.filter((item) => item.roleId === departmentId);
  return catalog;
}

export function filterHocTapQuizLibrary(
  catalog: HocTapQuizItem[],
  filters: {
    query: string;
    topic: HocTapQuizTopic;
    difficulty: HocTapQuizDifficultyFilter;
  },
): HocTapQuizItem[] {
  const normalizedQuery = normalizeHocTapSearchText(filters.query);

  return catalog.filter((quiz) => {
    if (filters.topic !== "all" && getHocTapQuizTopic(quiz) !== filters.topic) {
      return false;
    }
    if (
      filters.difficulty !== "all" &&
      quiz.difficulty !== filters.difficulty
    ) {
      return false;
    }
    if (!normalizedQuery) return true;

    return normalizeHocTapSearchText(
      `${quiz.title} ${quiz.description} ${quiz.category}`,
    ).includes(normalizedQuery);
  });
}

export function getHocTapQuizTopic(
  quiz: HocTapQuizItem,
): Exclude<HocTapQuizTopic, "all"> {
  if (quiz.theme === "marketing") return "marketing";
  if (quiz.theme === "prompt") return "prompt";
  if (quiz.theme === "data") return "data";
  if (quiz.theme === "automation") return "automation";
  return "ai-co-ban";
}

export function getHocTapDepartmentFilterValue(
  departmentId: AvailableQuizRoleId,
): HocTapQuizFilter {
  return `department:${departmentId}`;
}

export function parseHocTapDepartmentFilter(
  value: HocTapQuizFilter,
): AvailableQuizRoleId | null {
  if (!value.startsWith("department:")) return null;
  const departmentId = value.replace("department:", "");
  return isAvailableQuizRoleId(departmentId) ? departmentId : null;
}

export function sortHocTapQuizCatalog(
  catalog: HocTapQuizItem[],
  sort: HocTapQuizSort,
): HocTapQuizItem[] {
  return [...catalog].sort((a, b) => {
    if (sort === "question-count") {
      return b.questionCount - a.questionCount || b.publishedOrder - a.publishedOrder;
    }
    if (sort === "xp") {
      return b.xp - a.xp || b.publishedOrder - a.publishedOrder;
    }
    return b.publishedOrder - a.publishedOrder;
  });
}

export function getVisibleHocTapQuizzes(
  catalog: HocTapQuizItem[],
  expanded: boolean,
  initialCount = 4,
): HocTapQuizItem[] {
  return expanded ? catalog : catalog.slice(0, initialCount);
}

export function getHocTapQuizHref(quiz: HocTapQuizItem): string | null {
  if (
    quiz.status !== "available" ||
    !quiz.roleId ||
    !isAvailableQuizRoleId(quiz.roleId)
  ) {
    return null;
  }
  return `/kiem-tra/${quiz.roleId}?from=hoc-tap&quiz=${encodeURIComponent(
    quiz.id,
  )}`;
}

export function resolveQuizReturnHref(from: unknown): QuizReturnHref {
  return from === "hoc-tap" ? "/hoc-tap" : "/lo-trinh";
}

export type HocTapQuizAttempt = {
  id: string;
  quizId: string;
  score: number;
  xpEarned: number;
  createdAt: string;
};

export type HocTapQuizProgress = {
  totalXpEarned: number;
  attempts: HocTapQuizAttempt[];
};

export type HocTapLevelProgress = {
  level: number;
  currentXp: number;
  targetXp: number;
  totalXp: number;
  extraXp: number;
};

export type HocTapQuizAttemptResult = {
  attempt: HocTapQuizAttempt;
  progress: HocTapQuizProgress;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  levelProgress: HocTapLevelProgress;
};

export function calculateHocTapQuizXp(quizXp: number, score: number): number {
  const normalizedScore = clampScore(score);
  return Math.max(0, Math.round(quizXp * (normalizedScore / 100)));
}

export function calculateHocTapXpIncrement(
  quizXp: number,
  previousBestScore: number,
  currentScore: number,
): number {
  const previousXp = calculateHocTapQuizXp(quizXp, previousBestScore);
  const bestXp = calculateHocTapQuizXp(
    quizXp,
    Math.max(previousBestScore, currentScore),
  );
  return Math.max(0, bestXp - previousXp);
}

export function resolveHocTapLevelProgress(totalXp = 0): HocTapLevelProgress {
  const safeTotalXp = Math.max(0, Math.round(totalXp));
  const level = Math.floor(safeTotalXp / PROFILE_LEVEL_TARGET_XP) + 1;
  const currentXp = safeTotalXp % PROFILE_LEVEL_TARGET_XP;

  return {
    level,
    currentXp,
    targetXp: PROFILE_LEVEL_TARGET_XP,
    totalXp: safeTotalXp,
    extraXp: safeTotalXp,
  };
}

export function gradeHocTapQuizAnswers(input: {
  quizId: string;
  roleId: string;
  answers: number[];
}): {
  score: number;
  correctCount: number;
  questionCount: number;
} | null {
  const quiz = getHocTapQuiz(input.quizId);
  if (!quiz || quiz.roleId !== input.roleId) return null;
  if (input.answers.length !== quiz.questions.length) return null;

  let correctCount = 0;
  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    const answer = input.answers[index];
    if (
      !question ||
      !Number.isInteger(answer) ||
      answer >= question.options.length
    ) {
      return null;
    }
    if (
      answer >= 0 &&
      answer === question.correctIndex
    ) {
      correctCount += 1;
    }
  }

  return {
    score: Math.round((correctCount / quiz.questions.length) * 100),
    correctCount,
    questionCount: quiz.questions.length,
  };
}

export function getDemoHocTapQuizProgress(): HocTapQuizProgress {
  if (typeof window === "undefined") {
    return emptyHocTapProgress();
  }

  try {
    const raw = window.localStorage.getItem(DEMO_HOC_TAP_PROGRESS_KEY);
    if (!raw) return emptyHocTapProgress();
    return normalizeHocTapProgress(JSON.parse(raw));
  } catch {
    return emptyHocTapProgress();
  }
}

export function recordDemoHocTapQuizAttempt(
  quizId: string,
  score: number,
  attemptId = createAttemptId(),
): HocTapQuizAttemptResult {
  const progressBefore = getDemoHocTapQuizProgress();
  const levelBefore = resolveHocTapLevelProgress(
    progressBefore.totalXpEarned,
  ).level;
  const quiz = getHocTapQuiz(quizId);
  const normalizedScore = clampScore(score);
  const previousBest = progressBefore.attempts
    .filter((attempt) => attempt.quizId === quizId)
    .reduce((best, attempt) => Math.max(best, attempt.score), 0);
  const xpEarned = calculateHocTapXpIncrement(
    quiz?.xp ?? 0,
    previousBest,
    normalizedScore,
  );
  const attempt: HocTapQuizAttempt = {
    id: attemptId,
    quizId,
    score: normalizedScore,
    xpEarned,
    createdAt: new Date().toISOString(),
  };
  const progress: HocTapQuizProgress = {
    totalXpEarned: progressBefore.totalXpEarned + xpEarned,
    attempts: [attempt, ...progressBefore.attempts].slice(0, 50),
  };

  writeDemoHocTapQuizProgress(progress);

  const levelProgress = resolveHocTapLevelProgress(progress.totalXpEarned);

  return {
    attempt,
    progress,
    xpEarned,
    levelBefore,
    levelAfter: levelProgress.level,
    leveledUp: levelProgress.level > levelBefore,
    levelProgress,
  };
}

function toPlayableQuiz(seed: HocTapPlayableQuizSeed): HocTapPlayableQuiz {
  return {
    ...seed,
    questionCount: seed.questions.length,
    status: "available",
  };
}

function toHocTapQuizItem(seed: HocTapPlayableQuizSeed): HocTapQuizItem {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    creator: seed.creator,
    difficulty: seed.difficulty,
    xp: seed.xp,
    publishedOrder: seed.publishedOrder,
    theme: seed.theme,
    roleId: seed.roleId,
    questionCount: seed.questions.length,
    durationMinutes: seed.durationMinutes,
    status: "available",
  };
}

function normalizeHocTapSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function emptyHocTapProgress(): HocTapQuizProgress {
  return {
    totalXpEarned: 0,
    attempts: [],
  };
}

function normalizeHocTapProgress(value: unknown): HocTapQuizProgress {
  if (!value || typeof value !== "object") return emptyHocTapProgress();
  const raw = value as Partial<HocTapQuizProgress>;
  const attempts = Array.isArray(raw.attempts)
    ? raw.attempts.filter(isHocTapQuizAttempt)
    : [];
  const totalXpEarned =
    typeof raw.totalXpEarned === "number" && Number.isFinite(raw.totalXpEarned)
      ? Math.max(0, Math.round(raw.totalXpEarned))
      : attempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0);

  return {
    totalXpEarned,
    attempts,
  };
}

function isHocTapQuizAttempt(value: unknown): value is HocTapQuizAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<HocTapQuizAttempt>;
  return (
    typeof attempt.id === "string" &&
    typeof attempt.quizId === "string" &&
    typeof attempt.score === "number" &&
    typeof attempt.xpEarned === "number" &&
    typeof attempt.createdAt === "string"
  );
}

function writeDemoHocTapQuizProgress(progress: HocTapQuizProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEMO_HOC_TAP_PROGRESS_KEY,
      JSON.stringify(progress),
    );
    window.dispatchEvent(new Event("hoc-tap-overview-updated"));
  } catch {
    // Demo persistence is best effort in private/quota-limited browsers.
  }
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function createAttemptId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
