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

const HOC_TAP_PROGRESS_KEY = "ai_troly_hoc_tap_quiz_progress";
const BASE_PROFILE_LEVEL = 7;
const BASE_PROFILE_LEVEL_XP = 1280;
const BASE_PROFILE_TOTAL_XP = 2450;
const PROFILE_LEVEL_TARGET_XP = 2000;

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
    ],
  },
];

const COMING_SOON_QUIZZES: HocTapQuizItem[] = [
  {
    id: "prompt-engineering",
    title: "Prompt Engineering cơ bản",
    description:
      "Học cách viết yêu cầu rõ ràng để nhận kết quả sát mục tiêu hơn từ các công cụ AI.",
    category: "Prompt",
    creator: "TuanCoolBoy",
    difficulty: "Trung bình",
    xp: 70,
    publishedOrder: 3,
    theme: "prompt",
    roleId: null,
    questionCount: 12,
    durationMinutes: 20,
    status: "coming-soon",
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
    roleId: null,
    questionCount: 12,
    durationMinutes: 25,
    status: "coming-soon",
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
    roleId: null,
    questionCount: 15,
    durationMinutes: 20,
    status: "coming-soon",
  },
];

export function isAvailableQuizRoleId(
  value: string,
): value is AvailableQuizRoleId {
  return ROLE_ID_SET.has(value);
}

export function buildHocTapQuizCatalog(): HocTapQuizItem[] {
  const available = AVAILABLE_QUIZZES.map(toHocTapQuizItem);

  return [...available, ...COMING_SOON_QUIZZES];
}

export function getHocTapQuiz(quizId: string | null | undefined): HocTapPlayableQuiz | null {
  if (!quizId) return null;
  const quiz = AVAILABLE_QUIZZES.find((item) => item.id === quizId);
  return quiz ? toPlayableQuiz(quiz) : null;
}

export function resolveHocTapQuizForRoute(
  roleId: string,
  quizId: string | null | undefined,
): HocTapPlayableQuiz | null {
  const byId = getHocTapQuiz(quizId);
  if (byId) return byId.roleId === roleId ? byId : null;
  if (!isAvailableQuizRoleId(roleId)) return null;
  const byRole = AVAILABLE_QUIZZES.find((item) => item.roleId === roleId);
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
  return Math.max(10, Math.round(quizXp * (normalizedScore / 100)));
}

export function resolveHocTapLevelProgress(extraXp = 0): HocTapLevelProgress {
  const safeExtraXp = Math.max(0, Math.round(extraXp));
  let level = BASE_PROFILE_LEVEL;
  let currentXp = BASE_PROFILE_LEVEL_XP + safeExtraXp;

  while (currentXp >= PROFILE_LEVEL_TARGET_XP) {
    level += 1;
    currentXp -= PROFILE_LEVEL_TARGET_XP;
  }

  return {
    level,
    currentXp,
    targetXp: PROFILE_LEVEL_TARGET_XP,
    totalXp: BASE_PROFILE_TOTAL_XP + safeExtraXp,
    extraXp: safeExtraXp,
  };
}

export function getHocTapQuizProgress(): HocTapQuizProgress {
  if (typeof window === "undefined") {
    return emptyHocTapProgress();
  }

  try {
    const raw = window.localStorage.getItem(HOC_TAP_PROGRESS_KEY);
    if (!raw) return emptyHocTapProgress();
    return normalizeHocTapProgress(JSON.parse(raw));
  } catch {
    return emptyHocTapProgress();
  }
}

export function recordHocTapQuizAttempt(
  quizId: string,
  score: number,
): HocTapQuizAttemptResult {
  const progressBefore = getHocTapQuizProgress();
  const levelBefore = resolveHocTapLevelProgress(
    progressBefore.totalXpEarned,
  ).level;
  const quiz = getHocTapQuiz(quizId);
  const normalizedScore = clampScore(score);
  const xpEarned = calculateHocTapQuizXp(quiz?.xp ?? 50, normalizedScore);
  const attempt: HocTapQuizAttempt = {
    id: `hoc-tap-quiz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    quizId,
    score: normalizedScore,
    xpEarned,
    createdAt: new Date().toISOString(),
  };
  const progress: HocTapQuizProgress = {
    totalXpEarned: progressBefore.totalXpEarned + xpEarned,
    attempts: [attempt, ...progressBefore.attempts].slice(0, 50),
  };

  writeHocTapQuizProgress(progress);

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

function writeHocTapQuizProgress(progress: HocTapQuizProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOC_TAP_PROGRESS_KEY, JSON.stringify(progress));
    window.dispatchEvent(new Event("hoc-tap-quiz-progress"));
  } catch {
    // Best-effort mock XP only; ignore private-mode/quota errors.
  }
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}
