import Link from "next/link";
import { listCategories } from "@/server/actions/catalog-actions";
import { ServiceCard } from "@/components/catalog/ServiceCard";
import { buttonVariants } from "@/components/ui/button";

// The catalog changes from the dashboard at any time (staff add/reorder
// categories); force-dynamic keeps this page reading live data instead of
// a build-time snapshot, and also means `next build` doesn't need a
// reachable Postgres to prerender it statically.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-4 py-10">
        <h1 className="text-3xl font-bold">ID Cards, Stamps, Shields, Panaflex &amp; more</h1>
        <p className="max-w-xl text-muted-foreground">
          Farman Printing Press — from a single rubber stamp to a full corporate order,
          quoted and delivered on schedule.
        </p>
        <Link href="/inquiry" className={buttonVariants({ size: "default" })}>Request a Quote</Link>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Our Services</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {categories.map((category) => (
            <ServiceCard key={category.id} category={category} />
          ))}
        </div>
      </section>
    </div>
  );
}
