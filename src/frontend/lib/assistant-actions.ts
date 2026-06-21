// Gợi ý điều hướng + hành động nhanh cho widget trợ lý AI (rule-based, GĐ1).

export type AssistantAction =
  | { kind: "navigate"; id: string; label: string; href: string; icon: string }
  | { kind: "chat"; id: string; label: string; message: string; icon: string };

export type AppUserType = "employee" | "manager";

export function getAssistantNavActions(
  roleId: string | null,
  userType: AppUserType,
): AssistantAction[] {
  if (userType === "manager") {
    return [
      {
        kind: "navigate",
        id: "dashboard",
        label: "Tổng quan đội",
        href: "/quan-ly",
        icon: "📊",
      },
      {
        kind: "navigate",
        id: "leads",
        label: "Đăng ký nhận tin",
        href: "/quan-ly/leads",
        icon: "✉",
      },
      {
        kind: "navigate",
        id: "team",
        label: "Danh sách nhân viên",
        href: "/quan-ly/nhan-vien",
        icon: "👥",
      },
      {
        kind: "navigate",
        id: "tro-ly",
        label: "Trợ lý AI quản lý",
        href: "/tro-ly",
        icon: "✦",
      },
      {
        kind: "chat",
        id: "manager-ai",
        label: "Ai chậm tiến độ?",
        message: "Nhân viên nào đang chậm tiến độ học?",
        icon: "📉",
      },
    ];
  }

  if (!roleId) {
    return [
      {
        kind: "navigate",
        id: "onboarding",
        label: "Chọn vai trò của tôi",
        href: "/onboarding",
        icon: "🎯",
      },
      {
        kind: "navigate",
        id: "login-help",
        label: "Xem lộ trình học",
        href: "/lo-trinh",
        icon: "📚",
      },
    ];
  }

  return [
    {
      kind: "navigate",
      id: "lo-trinh",
      label: "Lộ trình học",
      href: "/lo-trinh",
      icon: "📚",
    },
    {
      kind: "navigate",
      id: "tro-ly-full",
      label: "Mở trợ lý đầy đủ",
      href: "/tro-ly",
      icon: "✦",
    },
    {
      kind: "navigate",
      id: "tien-bo",
      label: "Ghi tiến bộ / giờ tiết kiệm",
      href: "/tien-bo",
      icon: "⏱️",
    },
    {
      kind: "navigate",
      id: "kiem-tra",
      label: "Làm bài kiểm tra",
      href: `/kiem-tra/${roleId}`,
      icon: "✅",
    },
    {
      kind: "chat",
      id: "ai-la-gi",
      label: "AI là gì?",
      message: "AI là gì? Giúp em trong công việc thế nào?",
      icon: "💡",
    },
  ];
}
