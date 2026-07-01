import { ROLE_LABEL, type RoleId } from "@/lib/openai";

type ActivationEmailInput = {
  fullName: string;
  appUrl: string;
  roleLabel?: string | null;
};

export function resolveActivationRoleLabel(roleId?: string | null): string | null {
  const normalized = roleId?.trim();
  if (!normalized) return null;
  return ROLE_LABEL[normalized as RoleId] ?? normalized;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderButton(href: string, label: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td bgcolor="#15463B" style="border-radius: 999px;">
          <a href="${href}" style="display: inline-block; padding: 14px 24px; font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function buildActivationEmail({
  fullName,
  appUrl,
  roleLabel,
}: ActivationEmailInput) {
  const safeName = escapeHtml(fullName.trim() || "bạn");
  const safeRoleLabel = roleLabel?.trim() ? escapeHtml(roleLabel.trim()) : null;
  const learningUrl = new URL("/lo-trinh", appUrl).toString();
  const subject = "Lộ trình học AI cá nhân hóa của bạn đã sẵn sàng";
  const roleTextLine = safeRoleLabel ? `Vai trò: ${roleLabel?.trim()}` : null;
  const roleHtmlBlock = safeRoleLabel
    ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">Vai trò của bạn: <strong style="color:#15463B;">${safeRoleLabel}</strong></p>`
    : "";

  const text = [
    "AI Trợ Lý",
    `Chào ${fullName.trim() || "bạn"},`,
    "",
    ...(roleTextLine ? [roleTextLine, ""] : []),
    "Lộ trình học AI cá nhân hóa của bạn đã sẵn sàng.",
    `Mở lộ trình học: ${learningUrl}`,
    "",
    "Nếu bạn không yêu cầu, hãy bỏ qua email này.",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f6f4ef;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f4ef;padding:24px 12px;font-family:Arial,sans-serif;color:#1f2937;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e7dfd1;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#15463B,#1f5b4c);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:.8;">AI Trợ Lý</div>
                  <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;">Lộ trình học AI cá nhân hóa đã sẵn sàng</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 12px;font-size:16px;line-height:1.7;">Chào ${safeName},</p>
                  ${roleHtmlBlock}
                  <p style="margin:0 0 12px;font-size:16px;line-height:1.7;">Lộ trình học AI cá nhân hóa của bạn đã sẵn sàng. Bạn có thể bắt đầu học ngay bằng nút bên dưới.</p>
                  ${renderButton(learningUrl, "Vào lộ trình học ngay →")}
                  <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b5563;">Nếu nút không hoạt động, sao chép liên kết này:</p>
                  <p style="margin:0;font-size:14px;line-height:1.7;word-break:break-word;">
                    <a href="${learningUrl}" style="color:#15463B;text-decoration:underline;">${learningUrl}</a>
                  </p>
                  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, html, text };
}
