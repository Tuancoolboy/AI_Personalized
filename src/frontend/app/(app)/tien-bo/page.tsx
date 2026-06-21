import type { Metadata } from "next";
import { TienBoContent } from "@/components/tien-bo-content";

export const metadata: Metadata = {
  title: "Tiến bộ · AI Trợ Lý",
};

export default function TienBoPage() {
  return <TienBoContent />;
}
