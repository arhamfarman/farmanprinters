import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";
import type { Press } from "@prisma/client";

/**
 * Reproduces the printed letterhead exactly: press name, NTN, head/branch
 * office address, phones, email/website on the left; document type + its
 * number/date on the right — the same layout across Bill/Quotation/Challan
 * so a client who's used to the paper pads recognizes the digital ones.
 */
export function Letterhead({
  press,
  docTitle,
  docNumber,
  issueDate,
}: {
  press: Pick<Press, "name" | "ntnNumber" | "headOfficeAddress" | "branchOfficeAddress" | "phones" | "email" | "website">;
  docTitle: string;
  docNumber: string;
  issueDate: Date;
}) {
  return (
    <View style={pdfStyles.letterhead}>
      <View>
        <Text style={pdfStyles.pressName}>{press.name}</Text>
        {press.ntnNumber && <Text style={pdfStyles.pressMeta}>NTN: {press.ntnNumber}</Text>}
        {press.headOfficeAddress && <Text style={pdfStyles.pressMeta}>Head Office: {press.headOfficeAddress}</Text>}
        {press.branchOfficeAddress && <Text style={pdfStyles.pressMeta}>Branch: {press.branchOfficeAddress}</Text>}
        {press.phones.length > 0 && <Text style={pdfStyles.pressMeta}>Ph: {press.phones.join(" / ")}</Text>}
        {(press.email || press.website) && (
          <Text style={pdfStyles.pressMeta}>{[press.email, press.website].filter(Boolean).join("  ·  ")}</Text>
        )}
      </View>
      <View>
        <Text style={pdfStyles.docTitle}>{docTitle}</Text>
        <Text style={pdfStyles.docMeta}>No: {docNumber}</Text>
        <Text style={pdfStyles.docMeta}>Date: {issueDate.toLocaleDateString("en-PK")}</Text>
      </View>
    </View>
  );
}
