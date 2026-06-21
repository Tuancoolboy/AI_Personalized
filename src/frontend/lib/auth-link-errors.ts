// Map lỗi từ link xác nhận email Supabase (?error= / #error=) sang tiếng Việt.

export type AuthLinkErrorContent = {
  title: string;
  body: string;
  hint: string;
};

function decodeDescription(description: string | null | undefined): string {
  if (!description) return "";
  try {
    return decodeURIComponent(description.replace(/\+/g, " "));
  } catch {
    return description;
  }
}

export function getAuthLinkErrorContent(
  errorCode: string | null,
  error?: string | null,
  description?: string | null,
): AuthLinkErrorContent {
  const desc = decodeDescription(description).toLowerCase();

  if (
    errorCode === "otp_expired" ||
    desc.includes("expired") ||
    desc.includes("invalid or has expired")
  ) {
    return {
      title: "Link xác nhận email đã hết hạn",
      body: "Link trong email chỉ dùng được một lần và có thời hạn ngắn. Link bạn vừa mở không còn hiệu lực.",
      hint: "Nếu đã xác nhận email trước đó, hãy đăng nhập. Nếu chưa, đăng ký lại để nhận email mới.",
    };
  }

  if (errorCode === "otp_disabled") {
    return {
      title: "Xác nhận email tạm tắt",
      body: "Hệ thống không bật xác nhận qua email cho tài khoản này.",
      hint: "Thử đăng nhập trực tiếp hoặc liên hệ quản trị viên.",
    };
  }

  if (error === "access_denied" || errorCode === "access_denied") {
    return {
      title: "Không thể hoàn tất xác nhận",
      body:
        decodeDescription(description) ||
        "Yêu cầu xác nhận bị từ chối hoặc link không còn hợp lệ.",
      hint: "Đăng nhập nếu tài khoản đã kích hoạt, hoặc đăng ký lại.",
    };
  }

  if (errorCode === "validation_failed") {
    return {
      title: "Link xác nhận không hợp lệ",
      body: "Tham số trong link bị sai hoặc đã bị chỉnh sửa.",
      hint: "Mở lại link mới nhất trong email, hoặc đăng ký lại.",
    };
  }

  return {
    title: "Link xác nhận không hợp lệ",
    body:
      decodeDescription(description) ||
      "Không xử lý được yêu cầu xác nhận email từ link này.",
    hint: "Thử đăng nhập hoặc đăng ký lại để nhận email mới.",
  };
}

export function buildVerifiedErrorUrl(
  origin: string,
  params: {
    error?: string | null;
    errorCode?: string | null;
    description?: string | null;
  },
): URL {
  const url = new URL("/verified", origin);
  url.searchParams.set("status", "error");
  if (params.errorCode) url.searchParams.set("code", params.errorCode);
  if (params.error) url.searchParams.set("error", params.error);
  if (params.description) {
    url.searchParams.set("description", params.description);
  }
  return url;
}
