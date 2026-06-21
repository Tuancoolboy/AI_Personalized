import type { Metadata } from "next";
import { LoTrinhContent } from "@/components/lo-trinh-content";

export const metadata: Metadata = {
  title: "Lộ trình · AI Trợ Lý",
};

export default function LoTrinhPage() {
  return <LoTrinhContent />;
}
