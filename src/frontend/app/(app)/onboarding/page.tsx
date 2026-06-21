import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const metadata: Metadata = {
  title: "Onboarding · AI Trợ Lý",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
