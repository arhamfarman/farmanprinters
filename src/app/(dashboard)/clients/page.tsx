import Link from "next/link";
import { listClients } from "@/server/actions/client-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatPKR } from "@/lib/currency";

/** Landing page for the Clients nav item — search + a link into each client's ledger (the actual deliverable). */
export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const clients = await listClients(searchParams.q);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <form>
          <Input name="q" placeholder="Search clients…" defaultValue={searchParams.q} className="w-64" />
        </form>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Opening Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link href={`/dashboard/clients/${client.id}/ledger`} className="hover:underline">
                  {client.name}
                </Link>
              </TableCell>
              <TableCell>{client.companyName ?? "—"}</TableCell>
              <TableCell>{client.phone ?? "—"}</TableCell>
              <TableCell>{client.city ?? "—"}</TableCell>
              <TableCell>{formatPKR(client.openingBalanceMinor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
