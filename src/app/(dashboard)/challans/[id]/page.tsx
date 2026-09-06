import Link from "next/link";
import { getChallan } from "@/server/actions/challan-actions";
import { ChallanDeliveryForm } from "@/components/challans/ChallanDeliveryForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ChallanDetailPage({ params }: { params: { id: string } }) {
  const challan = await getChallan(params.id);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/challans" className="text-xs text-muted-foreground hover:underline">← Back to Challans</Link>
          <h1 className="mt-1 text-xl font-semibold">{challan.challanNumber}</h1>
          <p className="text-sm text-muted-foreground">{challan.client.companyName ?? challan.client.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{challan.status}</Badge>
          <a href={`/api/documents/challan/${challan.id}/pdf`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            Download PDF
          </a>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Particulars</TableHead>
            <TableHead>Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {challan.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.particulars}</TableCell>
              <TableCell>{item.quantity.toString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {challan.status === "PENDING" ? (
        <ChallanDeliveryForm challanId={challan.id} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Delivered by {challan.deliveredBy} · Received by {challan.receivedBy}
        </p>
      )}

      {challan.notes && <p className="text-sm text-muted-foreground">{challan.notes}</p>}
    </div>
  );
}
