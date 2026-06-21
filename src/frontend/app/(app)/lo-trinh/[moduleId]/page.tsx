import type { Metadata } from "next";
import { ModuleLessonContent } from "@/components/module-lesson-content";
import { fetchModuleById } from "@/lib/learning-modules";

type PageProps = { params: Promise<{ moduleId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { moduleId } = await params;
  const mod = await fetchModuleById(moduleId);
  return {
    title: mod ? `${mod.title} · Lộ trình` : "Bài học · AI Trợ Lý",
  };
}

export default async function ModuleLessonPage({ params }: PageProps) {
  const { moduleId } = await params;
  return <ModuleLessonContent moduleId={moduleId} />;
}
