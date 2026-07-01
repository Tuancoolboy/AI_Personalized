import {
  buildActivationEmail,
  resolveActivationRoleLabel,
} from "@/lib/email/templates/activation-email";
import {
  formatSmtpErrorMessage,
  getSmtpFailureReason,
} from "@/lib/email/smtp-errors";
import { getSmtpConfig, getSmtpTransporter } from "@/lib/email/smtp-client";

export type ActivationEmailSendResult =
  | { delivered: true; skipped: false }
  | { delivered: false; skipped: true; reason: string; detail?: string };

export async function sendActivationEmail(
  to: string,
  fullName: string,
  roleId?: string | null,
): Promise<ActivationEmailSendResult> {
  const transporter = getSmtpTransporter();
  const config = getSmtpConfig();

  if (!transporter) {
    console.warn("[activation-email] smtp_not_configured");
    return { delivered: false, skipped: true, reason: "smtp_not_configured" };
  }

  try {
    const mail = buildActivationEmail({
      fullName,
      appUrl: config.appUrl,
      roleLabel: resolveActivationRoleLabel(roleId),
    });
    await transporter.sendMail({
      from: config.from,
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return { delivered: true, skipped: false };
  } catch (error) {
    const detail = formatSmtpErrorMessage(error);
    console.warn("[activation-email]", detail);
    return {
      delivered: false,
      skipped: true,
      reason: getSmtpFailureReason(error),
      detail,
    };
  }
}
