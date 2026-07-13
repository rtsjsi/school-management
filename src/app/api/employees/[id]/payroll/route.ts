import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser, canAccessPayroll } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !canAccessPayroll(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Fetch salary history
    const { data: salaryHistory, error: err1 } = await supabase
      .from("employee_salary_history")
      .select("*")
      .eq("employee_id", id)
      .order("effective_from_date", { ascending: false });

    if (err1) throw err1;

    // Fetch leave balances
    const { data: leaveBalances, error: err2 } = await supabase
      .from("employee_leave_balances")
      .select("*")
      .eq("employee_id", id)
      .order("academic_year", { ascending: false });

    if (err2) throw err2;

    return NextResponse.json({ salaryHistory, leaveBalances });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !canAccessPayroll(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, payload } = body;
    const supabase = await createClient();

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (action === "add_salary_revision") {
      const { effective_from_date, basic_salary, allowance, child_allowance, pf_deduction } = payload;
      
      const { error } = await supabase.from("employee_salary_history").insert({
        employee_id: id,
        effective_from_date,
        basic_salary: parseFloat(basic_salary || "0"),
        allowance: parseFloat(allowance || "0"),
        child_allowance: parseFloat(child_allowance || "0"),
        pf_deduction: parseFloat(pf_deduction || "0"),
      });
      if (error) throw error;
      
      return NextResponse.json({ success: true });
    }

    if (action === "update_leave_balance") {
      const { academic_year, leave_type, allocated_days } = payload;
      
      const { error } = await supabase.from("employee_leave_balances").update({
        allocated_days: parseFloat(allocated_days || "0")
      }).eq("employee_id", id)
        .eq("academic_year", academic_year)
        .eq("leave_type", leave_type);
        
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
