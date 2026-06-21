"use client";

// Shell "Thiết kế lộ trình theo kỹ năng": 2 tab.
//  - "Theo phòng ban": phân cấp dọc (mặc định phòng + override từng member).
//  - "Theo cá nhân": wizard chọn 1 nhân viên (giữ như cũ).

import { useState } from "react";
import Link from "next/link";
import { DepartmentPathDesigner } from "@/components/manager-dept-path-designer";
import { MemberPathWizard } from "@/components/manager-member-path-wizard";

type BuilderMode = "department" | "member";

export function ManagerPathBuilder() {
  const [mode, setMode] = useState<BuilderMode>("department");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <Link
        href="/quan-ly"
        className="text-xs font-semibold text-ink-3 hover:text-brand"
      >
        ← Về dashboard
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Thiết kế lộ trình theo kỹ năng
      </h1>
      <p className="mt-1.5 text-sm text-ink-2">
        Áp kỹ năng mặc định cho cả phòng, tùy chỉnh riêng từng người khi cần →
        AI gợi ý lộ trình → gán cho nhân viên.
      </p>

      <div className="mt-6 flex gap-1 rounded-full bg-secondary/50 p-1">
        {(
          [
            ["department", "Theo phòng ban"],
            ["member", "Theo cá nhân"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              mode === key
                ? "bg-brand text-brand-foreground"
                : "text-ink-2 hover:text-brand"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "department" ? <DepartmentPathDesigner /> : <MemberPathWizard />}
    </div>
  );
}
