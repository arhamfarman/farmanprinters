import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";
import { Letterhead } from "./Letterhead";
import { formatPKR } from "@/lib/currency";
import type { Press, Client, InvoiceLineItem } from "@prisma/client";

export type BillPdfProps = {
  press: Parameters<typeof Letterhead>[0]["press"];
  invoice: {
    invoiceNumber: string;
    issueDate: Date;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    amountPaidMinor: number;
    notes: string | null;
  };
  client: Pick<Client, "name" | "companyName" | "address" | "phone" | "ntnNumber">;
  lineItems: Pick<InvoiceLineItem, "particulars" | "qty" | "rateMinor" | "amountMinor">[];
};

/** Matches the physical "BILL / CASH MEMO" pad: boxed S.No/Particulars/Qty/Rate/Amount table, Total row, single Signature line. */
export function BillPdf({ press, invoice, client, lineItems }: BillPdfProps) {
  const balanceDueMinor = invoice.totalMinor - invoice.amountPaidMinor;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Letterhead press={press} docTitle="BILL / CASH MEMO" docNumber={invoice.invoiceNumber} issueDate={invoice.issueDate} />

        <View style={pdfStyles.partyRow}>
          <View>
            <Text style={pdfStyles.partyLabel}>Billed To</Text>
            <Text style={pdfStyles.partyValue}>{client.companyName ?? client.name}</Text>
            {client.companyName && <Text style={pdfStyles.pressMeta}>{client.name}</Text>}
            {client.address && <Text style={pdfStyles.pressMeta}>{client.address}</Text>}
            {client.phone && <Text style={pdfStyles.pressMeta}>Ph: {client.phone}</Text>}
            {client.ntnNumber && <Text style={pdfStyles.pressMeta}>NTN: {client.ntnNumber}</Text>}
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={pdfStyles.cellSNo}>S.No</Text>
            <Text style={pdfStyles.cellParticulars}>Particulars</Text>
            <Text style={pdfStyles.cellQty}>Qty</Text>
            <Text style={pdfStyles.cellRate}>Rate</Text>
            <Text style={pdfStyles.cellAmount}>Amount</Text>
          </View>
          {lineItems.map((item, i) => (
            <View key={i} style={[pdfStyles.tableRow, pdfStyles.rowBorder]}>
              <Text style={pdfStyles.cellSNo}>{i + 1}</Text>
              <Text style={pdfStyles.cellParticulars}>{item.particulars}</Text>
              <Text style={pdfStyles.cellQty}>{item.qty.toString()}</Text>
              <Text style={pdfStyles.cellRate}>{formatPKR(item.rateMinor)}</Text>
              <Text style={pdfStyles.cellAmount}>{formatPKR(item.amountMinor)}</Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.totalsBlock}>
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.totalsLabel}>Subtotal</Text>
            <Text>{formatPKR(invoice.subtotalMinor)}</Text>
          </View>
          {invoice.discountMinor > 0 && (
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Discount</Text>
              <Text>-{formatPKR(invoice.discountMinor)}</Text>
            </View>
          )}
          {invoice.taxMinor > 0 && (
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Tax</Text>
              <Text>{formatPKR(invoice.taxMinor)}</Text>
            </View>
          )}
          <View style={pdfStyles.grandTotalRow}>
            <Text>Total</Text>
            <Text>{formatPKR(invoice.totalMinor)}</Text>
          </View>
          {invoice.amountPaidMinor > 0 && (
            <>
              <View style={pdfStyles.totalsRow}>
                <Text style={pdfStyles.totalsLabel}>Paid</Text>
                <Text>{formatPKR(invoice.amountPaidMinor)}</Text>
              </View>
              <View style={pdfStyles.totalsRow}>
                <Text style={pdfStyles.totalsLabel}>Balance Due</Text>
                <Text>{formatPKR(balanceDueMinor)}</Text>
              </View>
            </>
          )}
        </View>

        {invoice.notes && <Text style={pdfStyles.notes}>{invoice.notes}</Text>}

        <View style={pdfStyles.signatureBlock}>
          <View />
          <Text style={pdfStyles.signatureLine}>Signature</Text>
        </View>
      </Page>
    </Document>
  );
}
