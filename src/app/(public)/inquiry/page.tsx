import { InquiryForm } from "@/components/catalog/InquiryForm";
import { listCatalogItemsForInquiry } from "@/server/actions/catalog-actions";

// Catalog pricing can change from the dashboard at any time — see
// (public)/page.tsx for the same reasoning against a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function InquiryPage({ searchParams }: { searchParams: { categoryId?: string } }) {
  const catalogItems = await listCatalogItemsForInquiry();

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">Request a Quote</h1>
      <p className="text-muted-foreground">
        Pick items off our price list, add quantities, and attach any reference artwork — a staff member will follow up with a formal quotation.
      </p>
      <InquiryForm catalogItems={catalogItems} categoryId={searchParams.categoryId} />
    </div>
  );
}
