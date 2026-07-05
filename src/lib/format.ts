/**
 * Converts a price in cents to a yuan string with two decimals, e.g. 1990 →
 * "19.90". Pass `trimZeroFen` to drop a trailing ".00" for whole-yuan display.
 */
export function centsToYuan(
  cents: number,
  options?: { trimZeroFen?: boolean }
): string {
  const yuan = (cents / 100).toFixed(2);
  return options?.trimZeroFen ? yuan.replace(/\.00$/, "") : yuan;
}

/** Formats a price in cents as "¥19.90". */
export function formatYuan(cents: number): string {
  return `¥${centsToYuan(cents)}`;
}
