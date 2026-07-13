import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { LedgerLineItem } from "@/lib/data/ledger";
import { formatDisplayDate } from "@/lib/utils/format-date";

/** Standard PDF fonts only support WinAnsi — not ₦ or other Unicode symbols. */
function formatNairaForPdf(amount: number): string {
  const formatted = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `NGN ${formatted}`;
}

/** Strip/replace characters Helvetica cannot encode (WinAnsi). */
function pdfSafeText(text: string): string {
  return text
    .replace(/₦/g, "NGN ")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\u0000-\u00FF]/g, "");
}

export async function buildStatementPdf(input: {
  orgName: string;
  unitCode: string;
  tenantName: string;
  balance: number;
  lines: LedgerLineItem[];
  issuedAt: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const draw = (text: string, size = 11, useBold = false) => {
    page.drawText(pdfSafeText(text), {
      x: 50,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 8;
  };

  draw("ChopRent — Rent Statement", 18, true);
  draw(input.orgName, 12, true);
  y -= 4;
  draw(`Unit: ${input.unitCode}`);
  draw(`Tenant: ${input.tenantName}`);
  draw(`Issued: ${formatDisplayDate(input.issuedAt)}`);
  draw(`Balance due: ${formatNairaForPdf(input.balance)}`, 12, true);
  y -= 8;
  draw("Activity", 12, true);

  for (const line of input.lines.slice(0, 40)) {
    const sign = line.kind === "payment" ? "+" : "-";
    draw(
      `${formatDisplayDate(line.date)}  ${line.description.slice(0, 42)}  ${sign}${formatNairaForPdf(Math.abs(line.amount))}`,
      10,
    );
    if (y < 60) break;
  }

  return pdf.save();
}
