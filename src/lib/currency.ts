/**
 * Money is persisted as integer paisa (1/100 PKR) everywhere in the schema
 * (`*Minor` columns) to keep ledger arithmetic exact. These helpers are the
 * only place that should convert to/from a display rupee amount.
 */

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

export function minorToRupees(minor: number): number {
  return minor / 100;
}

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** e.g. formatPKR(1250000) -> "Rs 12,500" */
export function formatPKR(minor: number): string {
  return pkrFormatter.format(minorToRupees(minor)).replace("PKR", "Rs");
}

export function sumMinor(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
