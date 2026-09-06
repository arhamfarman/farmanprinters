import { listCategories } from "@/server/actions/catalog-actions";
import { ServiceCard } from "@/components/catalog/ServiceCard";

// See (public)/page.tsx — same reasoning: live catalog data, not a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.map((category) => (
          <ServiceCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
