import { StyleSheet } from "@react-pdf/renderer";

/**
 * Shared @react-pdf/renderer styles for Bill/Quotation/Challan — kept in one
 * file so the three pads look like one family of documents (same
 * letterhead block, same boxed table) the way the physical bill books do,
 * rather than each template drifting its own spacing.
 */
export const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2pt solid #1a1a1a",
    paddingBottom: 10,
    marginBottom: 14,
  },
  pressName: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  pressMeta: { fontSize: 8, color: "#444", marginTop: 2 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 9, textAlign: "right", marginTop: 2 },
  partyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  partyLabel: { fontSize: 8, color: "#666", textTransform: "uppercase" },
  partyValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  table: { border: "1pt solid #1a1a1a" },
  tableRow: { flexDirection: "row" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#eee", fontFamily: "Helvetica-Bold" },
  cellSNo: { width: "8%", padding: 5, borderRight: "1pt solid #1a1a1a" },
  cellParticulars: { width: "44%", padding: 5, borderRight: "1pt solid #1a1a1a" },
  cellQty: { width: "16%", padding: 5, borderRight: "1pt solid #1a1a1a", textAlign: "right" },
  cellRate: { width: "16%", padding: 5, borderRight: "1pt solid #1a1a1a", textAlign: "right" },
  cellAmount: { width: "16%", padding: 5, textAlign: "right" },
  cellParticularsWide: { width: "60%", padding: 5, borderRight: "1pt solid #1a1a1a" },
  cellQtyWide: { width: "32%", padding: 5, textAlign: "right" },
  rowBorder: { borderTop: "1pt solid #1a1a1a" },
  totalsBlock: { marginTop: 8, alignSelf: "flex-end", width: "40%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { color: "#444" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #1a1a1a",
    marginTop: 4,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  signatureBlock: { marginTop: 48, flexDirection: "row", justifyContent: "space-between" },
  signatureLine: { width: "40%", borderTop: "1pt solid #1a1a1a", paddingTop: 4, textAlign: "center", fontSize: 9 },
  notes: { marginTop: 16, fontSize: 9, color: "#444" },
});
