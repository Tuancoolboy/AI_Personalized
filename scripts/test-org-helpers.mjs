/** Slug duy nhất cho org test — tương thích migration 0016 (organizations.slug NOT NULL). */
export function slugFromTestEmail(email) {
  const local = (email.split("@")[0] ?? "test-org").toLowerCase();
  const slug = local.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (slug || "test-org").slice(0, 50);
}

export function organizationSeedRow(email, name) {
  return {
    name,
    slug: slugFromTestEmail(email),
    updated_at: new Date().toISOString(),
  };
}
