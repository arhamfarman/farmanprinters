import Link from "next/link";
import { listChallans } from "@/server/actions/challan-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
};

export default async function ChallansPage() {
  const challans = await listChallans();

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Delivery Challans</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Challan #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {challans.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/dashboard/challans/${c.id}`} className="hover:underline">{c.challanNumber}</Link>
              </TableCell>
              <TableCell>{c.client.companyName ?? c.client.name}</TableCell>
              <TableCell>{new Date(c.issueDate).toLocaleDateString("en-PK")}</TableCell>
              <TableCell><Badge className={STATUS_COLOR[c.status]}>{c.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
