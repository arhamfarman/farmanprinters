import Link from "next/link";
import { getCategoryBySlug } from "@/server/actions/catalog-actions";
import { formatPKR } from "@/lib/currency";
import { buttonVariants } from "@/components/ui/button";

// See (public)/page.tsx — same reasoning: live catalog data, not a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { categorySlug: string } }) {
  const category = await getCategoryBySlug(params.categorySlug);

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">{category.name}</h1>
      {category.description && <p className="text-muted-foreground">{category.description}</p>}

      <div className="flex flex-col divide-y divide-border rounded-md border border-border">
        {category.catalogItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <p className="font-medium">{item.name}</p>
              {item.description && <p className="text-muted-foreground">{item.description}</p>}
            </div>
            <span className="text-muted-foreground">from {formatPKR(item.defaultRateMinor)} / {item.unit}</span>
          </div>
        ))}
        {category.catalogItems.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Contact us for pricing on this category.</p>
        )}
      </div>

      <Link href={`/inquiry?categoryId=${category.id}`} className={buttonVariants({ size: "default" })}>
        Request a Quote for {category.name}
      </Link>
    </div>
  );
}
