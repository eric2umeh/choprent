import { compareNatural } from "@/lib/utils/natural-sort";

export type ParsedImportUnit = {
  unitCode: string;
  tenantName: string | null;
  annualRent: number | null;
  status: "vacant" | "occupied";
};

function cleanCell(value: string | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").trim();
}

function parseRent(value: string | undefined): number | null {
  const raw = cleanCell(value).replace(/[₦,]/g, "");
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function isHeaderOrMetaRow(row: string[]): boolean {
  const joined = row.map(cleanCell).join(" ").toLowerCase();
  return (
    !joined ||
    joined.includes("occupied") ||
    joined.includes("debtors") ||
    joined.includes("court case") ||
    joined.includes("quit") ||
    joined.includes("empty") ||
    joined.startsWith("total")
  );
}

function addUnit(
  map: Map<string, ParsedImportUnit>,
  unitCode: string,
  tenantName: string | null,
  annualRent: number | null
) {
  const code = cleanCell(unitCode);
  if (!code || /^total$/i.test(code)) return;
  if (/^\d+$/.test(code) && !tenantName && annualRent === null) return;

  const status: ParsedImportUnit["status"] =
    tenantName && tenantName.length > 0 ? "occupied" : "vacant";

  if (map.has(code)) {
    const existing = map.get(code)!;
    if (!existing.tenantName && tenantName) existing.tenantName = tenantName;
    if (!existing.annualRent && annualRent) existing.annualRent = annualRent;
    if (existing.status === "vacant" && status === "occupied") {
      existing.status = "occupied";
    }
    return;
  }

  map.set(code, {
    unitCode: code,
    tenantName,
    annualRent,
    status,
  });
}

/** Parse plaza-style spreadsheet rows (e.g. exported from Excel). */
export function parsePlazaSpreadsheetRows(rows: string[][]): ParsedImportUnit[] {
  const map = new Map<string, ParsedImportUnit>();

  for (const row of rows) {
    if (isHeaderOrMetaRow(row)) continue;

    for (let i = 1; i + 2 < row.length; i += 4) {
      const unitCode = row[i];
      const tenantName = cleanCell(row[i + 1]) || null;
      const annualRent = parseRent(row[i + 2]);
      addUnit(map, unitCode, tenantName, annualRent);
    }
  }

  return [...map.values()].sort((a, b) => compareNatural(a.unitCode, b.unitCode));
}

/** Parse simple CSV text: unit_code, tenant_name, annual_rent, status */
export function parseSimpleUnitsCsv(text: string): ParsedImportUnit[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const map = new Map<string, ParsedImportUnit>();
  const first = lines[0].toLowerCase();
  const startIndex =
    first.includes("unit") && (first.includes("code") || first.includes("shop"))
      ? 1
      : 0;

  for (const line of lines.slice(startIndex)) {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const unitCode = cells[0];
    const tenantName = cleanCell(cells[1]) || null;
    const annualRent = parseRent(cells[2]);
    const statusRaw = cleanCell(cells[3]).toLowerCase();
    addUnit(map, unitCode, tenantName, annualRent);
    const unit = map.get(cleanCell(unitCode));
    if (unit && (statusRaw === "vacant" || statusRaw === "empty")) {
      unit.status = "vacant";
      unit.tenantName = null;
    }
  }

  return [...map.values()].sort((a, b) => compareNatural(a.unitCode, b.unitCode));
}

export function parseUnitsImportText(text: string): ParsedImportUnit[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const matrix = lines.map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );

  const plazaLike =
    matrix.some((row) => isHeaderOrMetaRow(row)) ||
    matrix.some((row) => row.length >= 8);

  if (plazaLike) {
    return parsePlazaSpreadsheetRows(matrix);
  }

  return parseSimpleUnitsCsv(text);
}
