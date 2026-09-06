import { db } from "@/server/db";

/**
 * Public, unauthenticated reads for the (public) route group — no
 * requireRole() guard here on purpose, this is the marketing catalog.
 *
 * getPublicPress() is a placeholder for whichever press owns the public
 * site: today's skeleton is single-tenant-facing (one press's catalog per
 * deployment), so it just takes the first Press row. A real multi-tenant
 * rollout would resolve this from the request host instead — flagged here
 * rather than guessed at, since ARCHITECTURE.md doesn't specify a domain
 * scheme yet.
 */
export async function getPublicPress() {
  return db.press.findFirstOrThrow();
}

export async function listCategories() {
  const press = await getPublicPress();
  return db.productCategory.findMany({
    where: { pressId: press.id },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCategoryBySlug(slug: string) {
  const press = await getPublicPress();
  return db.productCategory.findFirstOrThrow({
    where: { pressId: press.id, slug },
    include: { catalogItems: { where: { isActive: true } } },
  });
}
