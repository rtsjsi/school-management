import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser, canAccessPayroll } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccessPayroll(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const employeeId = searchParams.get("employeeId");
    const usedOnly = searchParams.get("usedOnly") === "true";

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month (YYYY-MM) is required." }, { status: 400 });
    }

    const supabase = await createClient();

    let empQuery = supabase
      .from("employees")
      .select("id, employee_id, full_name, role, employee_type, status, enable_payroll, casual_leave_balance")
      .eq("status", "active")
      .eq("enable_payroll", true)
      .order("full_name");

    if (employeeId) {
      empQuery = empQuery.eq("id", employeeId);
    }

    const { data: employees, error: empErr } = await empQuery;
    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }

    const { data: usageRows, error: usageErr } = await supabase
      .from("employee_month_casual_leave_usage")
      .select("employee_id, days_used")
      .eq("month_year", month);
    if (usageErr) {
      return NextResponse.json({ error: usageErr.message }, { status: 500 });
    }

    const usedByEmp = new Map<string, number>();
    (usageRows ?? []).forEach((r) => {
      usedByEmp.set(r.employee_id, Number(r.days_used) || 0);
    });

    const { count: finalizedCount } = await supabase
      .from("employee_attendance_finalized")
      .select("employee_id", { count: "exact", head: true })
      .eq("month_year", month);

    const hasFinalize = (finalizedCount ?? 0) > 0;
    const hasUsage = (usageRows ?? []).some((r) => Number(r.days_used) > 0);

    if (!hasFinalize && !hasUsage) {
      return NextResponse.json({
        error:
          "No casual leave usage for this month. Finalize attendance on the Review screen first (or ensure CL was applied).",
        data: [],
        month,
      }, { status: 400 });
    }

    let rows = (employees ?? []).map((e) => {
      const used = usedByEmp.get(e.id) ?? 0;
      const closing = Number(e.casual_leave_balance ?? 0);
      const opening = closing + used;
      return {
        employee_uuid: e.id,
        employee_id: e.employee_id ?? "—",
        employee_name: e.full_name,
        role: e.role ?? "—",
        employee_type: e.employee_type ?? "—",
        status: e.status ?? "active",
        opening_balance: opening,
        days_used: used,
        closing_balance: closing,
      };
    });

    if (usedOnly) {
      rows = rows.filter((r) => r.days_used > 0);
    }

    const totalUsed = rows.reduce((s, r) => s + r.days_used, 0);
    const zeroBalance = rows.filter((r) => r.closing_balance <= 0).length;

    return NextResponse.json({
      month,
      data: rows,
      summary: {
        staff_count: rows.length,
        total_cl_used: totalUsed,
        zero_balance_count: zeroBalance,
      },
    });
  } catch (e) {
    console.error("casual-leave-report error", e);
    return NextResponse.json({ error: "Failed to load casual leave report." }, { status: 500 });
  }
}
