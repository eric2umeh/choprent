/** Merge optional payment note into metadata (works before payment_note column migration). */
export function metadataWithPaymentNote(
  base: Record<string, unknown>,
  note: string | null
): Record<string, unknown> {
  if (!note) return base;
  return { ...base, payment_note: note };
}
