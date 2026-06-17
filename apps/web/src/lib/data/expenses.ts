import { createAdminClient } from "@/lib/supabase/admin";
import type { ExpenseCategory } from "@/types/database";

export type ExpenseListItem = {
  id: string;
  siteId: string;
  propertyName: string;
  category: ExpenseCategory;
  description: string;
  amountNgn: number;
  expenseDate: string;
};

export type PropertyPnL = {
  siteId: string;
  propertyName: string;
  revenueNgn: number;
  expensesNgn: number;
  netNgn: number;
  marginPct: number;
};

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "diesel", label: "Diesel / generator" },
  { value: "security", label: "Security" },
  { value: "agency", label: "Agency / commission" },
  { value: "cleaning", label: "Cleaning" },
  { value: "repairs", label: "Repairs" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

export function formatExpenseCategory(category: ExpenseCategory): string {
  return EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

function currentYearBounds() {
  const year = new Date().getFullYear();
  return {
    year,
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

export async function listExpensesForOrg(orgId: string): Promise<ExpenseListItem[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("property_expenses")
      .select(
        "id, site_id, category, description, amount_ngn, expense_date, sites!inner(name, organization_id)"
      )
      .eq("organization_id", orgId)
      .order("expense_date", { ascending: false });

    return (data ?? []).map((row) => {
      const site = row.sites as { name: string } | { name: string }[] | null;
      const propertyName = Array.isArray(site) ? site[0]?.name : site?.name;
      return {
        id: row.id,
        siteId: row.site_id,
        propertyName: propertyName ?? "Property",
        category: row.category as ExpenseCategory,
        description: row.description,
        amountNgn: Number(row.amount_ngn),
        expenseDate: row.expense_date,
      };
    });
  } catch {
    return [];
  }
}

export async function getPropertyPnL(orgId: string): Promise<{
  year: number;
  rows: PropertyPnL[];
  totalRevenue: number;
  totalExpenses: number;
  totalNet: number;
}> {
  const { year, start, end } = currentYearBounds();

  try {
    const admin = createAdminClient();

    const [{ data: sites }, { data: payments }, { data: expenses }] = await Promise.all([
      admin.from("sites").select("id, name").eq("organization_id", orgId),
      admin
        .from("payments")
        .select("amount_ngn, unit_id, units!inner(site_id, organization_id)")
        .eq("organization_id", orgId)
        .eq("status", "verified")
        .gte("created_at", start)
        .lt("created_at", end),
      admin
        .from("property_expenses")
        .select("site_id, amount_ngn")
        .eq("organization_id", orgId)
        .gte("expense_date", start)
        .lt("expense_date", end),
    ]);

    const revenueBySite = new Map<string, number>();
    for (const payment of payments ?? []) {
      const units = payment.units as { site_id: string } | { site_id: string }[] | null;
      const siteId = Array.isArray(units) ? units[0]?.site_id : units?.site_id;
      if (!siteId) continue;
      revenueBySite.set(
        siteId,
        (revenueBySite.get(siteId) ?? 0) + Number(payment.amount_ngn)
      );
    }

    const expensesBySite = new Map<string, number>();
    for (const expense of expenses ?? []) {
      expensesBySite.set(
        expense.site_id,
        (expensesBySite.get(expense.site_id) ?? 0) + Number(expense.amount_ngn)
      );
    }

    const rows: PropertyPnL[] = (sites ?? []).map((site) => {
      const revenueNgn = revenueBySite.get(site.id) ?? 0;
      const expensesNgn = expensesBySite.get(site.id) ?? 0;
      const netNgn = revenueNgn - expensesNgn;
      const marginPct =
        revenueNgn > 0 ? Math.round((netNgn / revenueNgn) * 100) : 0;
      return {
        siteId: site.id,
        propertyName: site.name,
        revenueNgn,
        expensesNgn,
        netNgn,
        marginPct,
      };
    });

    const totalRevenue = rows.reduce((sum, row) => sum + row.revenueNgn, 0);
    const totalExpenses = rows.reduce((sum, row) => sum + row.expensesNgn, 0);

    return {
      year,
      rows,
      totalRevenue,
      totalExpenses,
      totalNet: totalRevenue - totalExpenses,
    };
  } catch {
    return {
      year,
      rows: [],
      totalRevenue: 0,
      totalExpenses: 0,
      totalNet: 0,
    };
  }
}
