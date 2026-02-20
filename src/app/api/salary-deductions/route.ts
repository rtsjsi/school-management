import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get("monthYear");
    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: deductions } = await supabase
      .from("salary_deduction_items")
      .select(`
        id,
        employee_id,
        deduction_type,
        amount,
        description,
        employees(full_name, employee_id)
      `)
      .eq("month_year", monthYear)
      .order("employee_id");

    const { data: allowances } = await supabase
      .from("salary_allowance_items")
      .select(`
        id,
        employee_id,
        allowance_type,
        amount,
        description,
        employees(full_name, employee_id)
      `)
      .eq("month_year", monthYear)
      .order("employee_id");

    return NextResponse.json({
      deductions: deductions ?? [],
      allowances: allowances ?? [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
