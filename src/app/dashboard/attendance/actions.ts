"use server";

import { createClient } from "@/lib/supabase/server";

export type SalaryActionResult = { ok: true } | { ok: false; error: string };

const DEDUCTION_TYPES = ["pf", "tds", "advance", "other"] as const;
const ALLOWANCE_TYPES = ["hra", "transport", "medical", "other"] as const;

export async function upsertSalaryDeduction(
  employeeId: string,
  monthYear: string,
  deductionType: string,
  amount: number,
  description?: string
): Promise<SalaryActionResult> {
  if (!DEDUCTION_TYPES.includes(deductionType as (typeof DEDUCTION_TYPES)[number])) {
    return { ok: false, error: "Invalid deduction type." };
  }
  if (amount < 0) return { ok: false, error: "Amount must be non-negative." };

  const supabase = await createClient();
  const { error } = await supabase.from("salary_deduction_items").upsert(
    {
      employee_id: employeeId,
      month_year: monthYear,
      deduction_type: deductionType,
      amount: Math.round(amount * 100) / 100,
      description: description?.trim() || null,
    },
    { onConflict: "employee_id,month_year,deduction_type" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSalaryDeduction(
  employeeId: string,
  monthYear: string,
  deductionType: string
): Promise<SalaryActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salary_deduction_items")
    .delete()
    .eq("employee_id", employeeId)
    .eq("month_year", monthYear)
    .eq("deduction_type", deductionType);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertSalaryAllowance(
  employeeId: string,
  monthYear: string,
  allowanceType: string,
  amount: number,
  description?: string
): Promise<SalaryActionResult> {
  if (!ALLOWANCE_TYPES.includes(allowanceType as (typeof ALLOWANCE_TYPES)[number])) {
    return { ok: false, error: "Invalid allowance type." };
  }
  if (amount < 0) return { ok: false, error: "Amount must be non-negative." };

  const supabase = await createClient();
  const { error } = await supabase.from("salary_allowance_items").upsert(
    {
      employee_id: employeeId,
      month_year: monthYear,
      allowance_type: allowanceType,
      amount: Math.round(amount * 100) / 100,
      description: description?.trim() || null,
    },
    { onConflict: "employee_id,month_year,allowance_type" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSalaryAllowance(
  employeeId: string,
  monthYear: string,
  allowanceType: string
): Promise<SalaryActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salary_allowance_items")
    .delete()
    .eq("employee_id", employeeId)
    .eq("month_year", monthYear)
    .eq("allowance_type", allowanceType);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
