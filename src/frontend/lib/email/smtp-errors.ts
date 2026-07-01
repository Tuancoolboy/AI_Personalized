const GMAIL_APP_PASSWORD_HINT =
  "Gmail yêu cầu App Password (không dùng mật khẩu đăng nhập thường). Tạo tại https://myaccount.google.com/apppasswords rồi đặt vào SMTP_PASS.";

export function formatSmtpErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("application-specific password") ||
    normalized.includes("invalidsecondfactor")
  ) {
    return GMAIL_APP_PASSWORD_HINT;
  }

  if (normalized.includes("invalid login") || normalized.includes("authentication")) {
    return `SMTP xác thực thất bại. Kiểm tra SMTP_USER/SMTP_PASS. ${GMAIL_APP_PASSWORD_HINT}`;
  }

  return message;
}

export function getSmtpFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("application-specific password") ||
    normalized.includes("invalidsecondfactor")
  ) {
    return "gmail_app_password_required";
  }

  if (normalized.includes("invalid login") || normalized.includes("authentication")) {
    return "smtp_auth_failed";
  }

  return "smtp_send_failed";
}
