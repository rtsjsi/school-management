import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date"); // YYYY-MM-DD optional filter
    const employeesOnly = searchParams.get("employeesOnly") === "true";

    // Fetch employee list for the filter dropdown
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, biometric_enroll_no")
      .order("full_name");

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    // If only employees requested, return early
    if (employeesOnly) {
      return NextResponse.json({ employees: employees ?? [] });
    }

    // Look up the selected employee's biometric enroll number
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
    }

    const employee = (employees ?? []).find((e) => e.id === employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const enrollNo = employee.biometric_enroll_no;
    if (enrollNo == null) {
      return NextResponse.json({
        employees: employees ?? [],
        punches: [],
        warning: "This employee does not have a biometric enroll number mapped.",
      });
    }

    // biometric_attendance_raw has RLS with service-role-only access
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfigured (missing service role key)." },
        { status: 500 }
      );
    }

    const filterByDate = !!(date && /^\d{4}-\d{2}-\d{2}$/.test(date));
    let punchQuery = admin
      .from("biometric_attendance_raw")
      .select("id, enroll_no, punched_at, direction, verify_method, machine_no, received_at")
      .eq("enroll_no", String(enrollNo))
      .order("punched_at", { ascending: filterByDate })
      .limit(filterByDate ? 200 : 500);

    if (filterByDate && date) {
      // ±1 day UTC window so IST calendar day is fully covered, then filter in JS.
      const day = new Date(`${date}T00:00:00Z`);
      const from = new Date(day.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(day.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      punchQuery = punchQuery.gte("punched_at", from).lt("punched_at", to);
    }

    const { data: punches, error: punchError } = await punchQuery;

    if (punchError) {
      return NextResponse.json({ error: punchError.message }, { status: 500 });
    }

    const filtered =
      filterByDate && date
        ? (punches ?? []).filter((p) => {
            const istDate = new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(p.punched_at));
            return istDate === date;
          })
        : punches ?? [];

    return NextResponse.json({
      employees: employees ?? [],
      punches: filtered,
      enrollNo,
      date: date || null,
    });
  } catch (e) {
    console.error("attendance-punches error", e);
    return NextResponse.json({ error: "Failed to fetch attendance punches." }, { status: 500 });
  }
}
