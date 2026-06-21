/**
 * Seed bảng learning_modules vào Supabase.
 * Chạy: npm run seed:modules (cần migration 0004 đã apply)
 *
 * Dùng PostgREST trực tiếp thay vì @supabase/supabase-js để tránh khởi tạo
 * Realtime/WebSocket khi chạy bằng Node 20.
 */

import { LEARNING_MODULES } from "../src/frontend/lib/learning-modules-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const rows = LEARNING_MODULES.map((m) => ({
  id: m.id,
  role_id: m.role_id,
  title: m.title,
  duration_min: m.duration_min,
  level: m.level,
  sort_order: m.sort_order,
  summary: m.summary,
  content: m.content,
  learnings: m.learnings,
  sections: m.sections,
  practice_prompt: m.practice_prompt,
  attached_file: m.attached_file,
  updated_at: new Date().toISOString(),
}));

async function main() {
  console.log(`Seeding ${rows.length} learning_modules...`);

  const response = await fetch(`${url}/rest/v1/learning_modules?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Seed failed:", body || response.statusText);
    process.exit(1);
  }

  console.log(`✓ Đã upsert ${rows.length} bài học.`);
}

main();
