"use server";

import { revalidatePath } from "next/cache";
import { canManageExpenses } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { getPropertyForOrg } from "@/lib/data/sites";
import { revalidatePropertyDashboardPaths } from "@/lib/routes/revalidate-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExpenseCategory } from "@/types/database";

export type ExpenseActionState = {
  error?: string;
  success?: boolean;
};

const CATEGORIES: ExpenseCategory[] = [
  "maintenance",
  "diesel",
  "security",
  "agency",
  "cleaning",
  "repairs",
  "utilities",
  "other",
];

export async function saveExpense(
  orgSlug: string,
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageExpenses(ctx.role)) {
    return { error: "You don't have permission to manage expenses." };
  }

  const expenseId = String(formData.get("expense_id") ?? "").trim() || null;
  const siteId = String(formData.get("site_id") ?? "").trim();
  const unitId = String(formData.get("unit_id") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other") as ExpenseCategory;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount_ngn"));
  const expenseDate = String(formData.get("expense_date") ?? "").trim();

  if (!siteId || !description || !expenseDate) {
    return { error: "Property, description, and date are required." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "Invalid expense category." };
  }

  const property = await getPropertyForOrg(ctx.org.id, siteId);
  if (!property) return { error: "Property not found." };

  if (unitId) {
    const admin = createAdminClient();
    const { data: unit } = await admin
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("site_id", siteId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();
    if (!unit) return { error: "Unit not found in this property." };
  }

  const admin = createAdminClient();
  const payload = {
    organization_id: ctx.org.id,
    site_id: siteId,
    unit_id: unitId,
    category,
    description,
    amount_ngn: amount,
    expense_date: expenseDate,
    created_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  };

  if (expenseId) {
    const { data: existing } = await admin
      .from("property_expenses")
      .select("id")
      .eq("id", expenseId)
      .eq("organization_id", ctx.org.id)
      .maybeSingle();

    if (!existing) return { error: "Expense not found." };

    const { error } = await admin
      .from("property_expenses")
      .update(payload)
      .eq("id", expenseId);

    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("property_expenses").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath(`/d/${orgSlug}/expenses`);
  revalidatePath(`/d/${orgSlug}/analytics`);
  revalidatePath(`/d/${orgSlug}/reports`);
  if (unitId) {
    const { data: unitRow } = await admin
      .from("units")
      .select("unit_code")
      .eq("id", unitId)
      .maybeSingle();
    await revalidatePropertyDashboardPaths(
      orgSlug,
      ctx.org.id,
      siteId,
      unitRow?.unit_code
    );
  } else {
    await revalidatePropertyDashboardPaths(orgSlug, ctx.org.id, siteId);
  }
  return { success: true };
}

export async function deleteExpense(
  orgSlug: string,
  expenseId: string
): Promise<ExpenseActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageExpenses(ctx.role)) {
    return { error: "You don't have permission to manage expenses." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("property_expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!existing) return { error: "Expense not found." };

  const { error } = await admin.from("property_expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/expenses`);
  revalidatePath(`/d/${orgSlug}/analytics`);
  revalidatePath(`/d/${orgSlug}/reports`);
  return { success: true };
}
