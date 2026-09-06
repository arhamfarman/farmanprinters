import { listNetwork } from "@/server/actions/network-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PARTNERSHIP_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  REVOKED: "bg-red-100 text-red-800",
};

/**
 * Partner presses + what's flowing between tenants via SharedAsset — this
 * is the UI surface for the multi-tenant sharing model in ARCHITECTURE.md
 * §4: outsourced jobs hand off files here without merging client/ledger
 * data between presses.
 */
export default async function NetworkPage() {
  const { partnerships, sharedByMe, sharedWithMe } = await listNetwork();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Network</h1>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Partner Presses</h2>
        <div className="flex flex-col gap-2">
          {partnerships.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span>{p.pressA.name} ↔ {p.pressB.name}</span>
              <Badge className={PARTNERSHIP_COLOR[p.status]}>{p.status}</Badge>
            </div>
          ))}
          {partnerships.length === 0 && <p className="text-sm text-muted-foreground">No partner presses yet.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Shared by you</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {sharedByMe.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.asset.fileName}</span>
                <span className="text-muted-foreground">to {s.sharedWithPress.name}</span>
              </div>
            ))}
            {sharedByMe.length === 0 && <p className="text-muted-foreground">Nothing shared yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Shared with you</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {sharedWithMe.map((s) => (
              <div key={s.id} className="flex justify-between">
                <span>{s.asset.fileName}</span>
                <span className="text-muted-foreground">from {s.sharedByPress.name}</span>
              </div>
            ))}
            {sharedWithMe.length === 0 && <p className="text-muted-foreground">Nothing shared with you yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
