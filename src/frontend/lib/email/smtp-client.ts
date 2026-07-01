import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null | undefined;

export function formatEmailFrom(
  address: string,
  name?: string,
): string | { name: string; address: string } {
  const trimmedAddress = address.trim();
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return trimmedAddress;
  }
  return { name: trimmedName, address: trimmedAddress };
}

function readSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number.parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const fromAddress = process.env.EMAIL_FROM?.trim() || user;
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure: (Number.isFinite(port) ? port : 465) === 465,
    user,
    pass,
    fromAddress,
    fromName,
    from: formatEmailFrom(fromAddress, fromName),
    appUrl,
  };
}

export function getSmtpConfig() {
  return readSmtpConfig();
}

export function getSmtpTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const config = readSmtpConfig();
  if (!config.user || !config.pass || !config.fromAddress || !config.appUrl) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}
