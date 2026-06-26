/** Read payment note from column or metadata fallback. */
export function paymentNoteFromRow(row: {
  payment_note?: string | null;
  metadata?: unknown;
}): string | null {
  const direct = row.payment_note?.trim();
  if (direct) return direct;

  if (!row.metadata || typeof row.metadata !== "object") return null;
  const note = (row.metadata as { payment_note?: unknown }).payment_note;
  return typeof note === "string" && note.trim() ? note.trim() : null;
}
