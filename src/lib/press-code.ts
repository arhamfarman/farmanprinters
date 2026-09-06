/** "Farman Printing Press" -> "FPP". Falls back to the first 3 letters for
 * presses whose name doesn't split into clean initials. Shared by every
 * document-numbering call site (order/quotation/invoice/challan actions)
 * so "FPP-BILL-2026-006339"-style numbers stay consistent across document
 * types for the same press. */
export function pressCode(pressName: string): string {
  const initials = pressName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.length >= 2 ? initials : pressName.slice(0, 3).toUpperCase();
}
