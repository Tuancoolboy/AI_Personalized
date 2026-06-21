import { NextResponse } from "next/server";
import { fetchModuleById } from "@/lib/learning-modules";

type Params = { params: Promise<{ moduleId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { moduleId } = await params;
  const mod = await fetchModuleById(moduleId);

  if (!mod) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy bài học." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, module: mod });
}
