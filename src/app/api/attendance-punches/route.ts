import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const employeesOnly = searchParams.get("employeesOnly") === "true";

    // Fetch employee list for the filter dropdown
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name")
      .order("full_name");

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    // If only employees requested, return early
    if (employeesOnly) {
      return NextResponse.json({ employees: employees ?? [] });
    }

    // Build punch query
    let query = supabase
      .from("employee_attendance_punches")
      .select(
        "id, employee_id, punch_date, punch_time, punch_type, is_late, is_early_departure, source, created_at, employees(full_name)"
      )
      .order("punch_time", { ascending: false })
      .limit(500);

    if (employeeId && employeeId !== "all") {
      query = query.eq("employee_id", employeeId);
    }

    const { data: punches, error: punchError } = await query;

    if (punchError) {
      return NextResponse.json({ error: punchError.message }, { status: 500 });
    }

    return NextResponse.json({ employees: employees ?? [], punches: punches ?? [] });
  } catch (e) {
    console.error("attendance-punches error", e);
    return NextResponse.json({ error: "Failed to fetch attendance punches." }, { status: 500 });
  }
}
