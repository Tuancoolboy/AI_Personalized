import type { Metadata } from "next";
import { OperatorLoginForm } from "@/components/operator-login-form";

export const metadata: Metadata = {
  title: "Đăng nhập Vận hành · AI Trợ Lý",
};

type OperatorLoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    denied?: string;
  }>;
};

export default async function OperatorLoginPage({
  searchParams,
}: OperatorLoginPageProps) {
  const query = await searchParams;

  return (
    <OperatorLoginForm
      nextFromQuery={query.next ?? null}
      urlError={query.error ?? null}
      denied={query.denied === "1"}
    />
  );
}
