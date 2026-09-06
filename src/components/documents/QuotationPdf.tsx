import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";
import { Letterhead } from "./Letterhead";
import { formatPKR } from "@/lib/currency";
import type { Client, QuotationLineItem } from "@prisma/client";
import type { BillPdfProps } from "./BillPdf";

export type QuotationPdfProps = {
  press: BillPdfProps["press"];
  quotation: {
    quotationNumber: string;
    issueDate: Date;
    validUntil: Date | null;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    notes: string | null;
  };
  client: Pick<Client, "name" | "companyName" | "address" | "phone" | "ntnNumber">;
  lineItems: Pick<QuotationLineItem, "particulars" | "qty" | "rateMinor" | "amountMinor">[];
};

/** Matches the physical "QUOTATION" pad — same boxed table as the Bill, plus a Valid Until line since a quotation expires and a bill doesn't. */
export function QuotationPdf({ press, quotation, client, lineItems }: QuotationPdfProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Letterhead press={press} docTitle="QUOTATION" docNumber={quotation.quotationNumber} issueDate={quotation.issueDate} />

        <View style={pdfStyles.partyRow}>
          <View>
            <Text style={pdfStyles.partyLabel}>Quotation For</Text>
            <Text style={pdfStyles.partyValue}>{client.companyName ?? client.name}</Text>
            {client.companyName && <Text style={pdfStyles.pressMeta}>{client.name}</Text>}
            {client.address && <Text style={pdfStyles.pressMeta}>{client.address}</Text>}
            {client.phone && <Text style={pdfStyles.pressMeta}>Ph: {client.phone}</Text>}
          </View>
          {quotation.validUntil && (
            <View>
              <Text style={pdfStyles.partyLabel}>Valid Until</Text>
              <Text style={pdfStyles.partyValue}>{quotation.validUntil.toLocaleDateString("en-PK")}</Text>
            </View>
          )}
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
            <Text>{formatPKR(quotation.subtotalMinor)}</Text>
          </View>
          {quotation.discountMinor > 0 && (
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Discount</Text>
              <Text>-{formatPKR(quotation.discountMinor)}</Text>
            </View>
          )}
          {quotation.taxMinor > 0 && (
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Tax</Text>
              <Text>{formatPKR(quotation.taxMinor)}</Text>
            </View>
          )}
          <View style={pdfStyles.grandTotalRow}>
            <Text>Total</Text>
            <Text>{formatPKR(quotation.totalMinor)}</Text>
          </View>
        </View>

        {quotation.notes && <Text style={pdfStyles.notes}>{quotation.notes}</Text>}

        <View style={pdfStyles.signatureBlock}>
          <View />
          <Text style={pdfStyles.signatureLine}>Signature</Text>
        </View>
      </Page>
    </Document>
  );
}
