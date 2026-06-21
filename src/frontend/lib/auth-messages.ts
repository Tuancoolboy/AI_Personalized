// Map lỗi Supabase Auth sang tiếng Việt cho form login/register.

export function getAuthErrorMessage(
  code: string | undefined,
  fallbackMessage?: string,
): string {
  switch (code) {
    case "email_not_confirmed":
      return "Email chưa được xác nhận. Mở link trong hộp thư (hoặc tắt Confirm email trong Supabase khi dev).";
    case "invalid_credentials":
      return "Email hoặc mật khẩu sai.";
    case "user_already_registered":
      return "Email này đã được đăng ký. Hãy đăng nhập.";
    case "weak_password":
      return "Mật khẩu quá yếu. Dùng ít nhất 8 ký tự.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Gửi quá nhiều yêu cầu. Đợi vài phút rồi thử lại.";
    default:
      if (fallbackMessage?.toLowerCase().includes("email not confirmed")) {
        return "Email chưa được xác nhận. Kiểm tra hộp thư hoặc liên hệ admin.";
      }
      return fallbackMessage ?? "Không thực hiện được. Vui lòng thử lại sau.";
  }
}
