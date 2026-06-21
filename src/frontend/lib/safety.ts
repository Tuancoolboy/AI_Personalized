// Phát hiện dữ liệu nhạy cảm trong tin nhắn chat — dùng chung client + server.

export const SAFETY_TRIGGERS = [
  /\b\d{9,13}\b/,
  /STK|tài khoản|account number/i,
  /mật khẩu|password/i,
  /CMND|CCCD/i,
];

export const SAFETY_WARNING =
  "⚠ **Em phát hiện thông tin có thể nhạy cảm** (số điện thoại / tài khoản / mật khẩu) trong câu hỏi. Nhắc anh/chị: không nên đưa dữ liệu cá nhân của khách lên công cụ AI công cộng. Hãy mô tả tình huống chung — không kèm thông tin định danh — để em trả lời an toàn hơn.";

export function detectSensitiveData(text: string): boolean {
  return SAFETY_TRIGGERS.some((trigger) => trigger.test(text));
}

export function getSafetyWarning(text: string): string | undefined {
  return detectSensitiveData(text) ? SAFETY_WARNING : undefined;
}
