import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatNaira } from "@/lib/auth/roles";
import type { LedgerLineItem } from "@/lib/data/ledger";

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
    page.drawText(text, {
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
  draw(`Issued: ${input.issuedAt}`);
  draw(`Balance due: ${formatNaira(input.balance)}`, 12, true);
  y -= 8;
  draw("Activity", 12, true);

  for (const line of input.lines.slice(0, 40)) {
    const sign = line.kind === "payment" ? "+" : "−";
    draw(
      `${line.date}  ${line.description.slice(0, 42)}  ${sign}${formatNaira(Math.abs(line.amount))}`,
      10
    );
    if (y < 60) break;
  }

  return pdf.save();
}
