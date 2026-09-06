import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";
import { Letterhead } from "./Letterhead";
import type { Client, DeliveryChallanItem } from "@prisma/client";
import type { BillPdfProps } from "./BillPdf";

export type ChallanPdfProps = {
  press: BillPdfProps["press"];
  challan: {
    challanNumber: string;
    issueDate: Date;
    deliveredBy: string | null;
    receivedBy: string | null;
    notes: string | null;
  };
  client: Pick<Client, "name" | "companyName" | "address" | "phone">;
  items: Pick<DeliveryChallanItem, "particulars" | "quantity">[];
};

/**
 * Matches the physical Delivery Challan pad: no Rate/Amount columns (it's a
 * goods-received slip, not a bill) and two signature lines — Delivered by
 * / Received by — instead of the single Signature line on Bill/Quotation.
 */
export function ChallanPdf({ press, challan, client, items }: ChallanPdfProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Letterhead press={press} docTitle="DELIVERY CHALLAN" docNumber={challan.challanNumber} issueDate={challan.issueDate} />

        <View style={pdfStyles.partyRow}>
          <View>
            <Text style={pdfStyles.partyLabel}>Deliver To</Text>
            <Text style={pdfStyles.partyValue}>{client.companyName ?? client.name}</Text>
            {client.companyName && <Text style={pdfStyles.pressMeta}>{client.name}</Text>}
            {client.address && <Text style={pdfStyles.pressMeta}>{client.address}</Text>}
            {client.phone && <Text style={pdfStyles.pressMeta}>Ph: {client.phone}</Text>}
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={pdfStyles.cellSNo}>S.No</Text>
            <Text style={pdfStyles.cellParticularsWide}>Particulars</Text>
            <Text style={pdfStyles.cellQtyWide}>Quantity</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[pdfStyles.tableRow, pdfStyles.rowBorder]}>
              <Text style={pdfStyles.cellSNo}>{i + 1}</Text>
              <Text style={pdfStyles.cellParticularsWide}>{item.particulars}</Text>
              <Text style={pdfStyles.cellQtyWide}>{item.quantity.toString()}</Text>
            </View>
          ))}
        </View>

        {challan.notes && <Text style={pdfStyles.notes}>{challan.notes}</Text>}

        <View style={pdfStyles.signatureBlock}>
          <Text style={pdfStyles.signatureLine}>Delivered by{challan.deliveredBy ? `: ${challan.deliveredBy}` : ""}</Text>
          <Text style={pdfStyles.signatureLine}>Received by{challan.receivedBy ? `: ${challan.receivedBy}` : ""}</Text>
        </View>
      </Page>
    </Document>
  );
}
