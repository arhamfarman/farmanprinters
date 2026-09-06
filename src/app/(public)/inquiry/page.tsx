import { InquiryForm } from "@/components/catalog/InquiryForm";

export default function InquiryPage({ searchParams }: { searchParams: { categoryId?: string } }) {
  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold">Request a Quote</h1>
      <p className="text-muted-foreground">
        Tell us what you need and attach any reference artwork — a staff member will follow up with a quotation.
      </p>
      <InquiryForm categoryId={searchParams.categoryId} />
    </div>
  );
}
