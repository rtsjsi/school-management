import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get("monthYear");
    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const [y, m] = monthYear.split("-");
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

    const supabase = await createClient();

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .gte("date", start)
      .lte("date", end);
    const holidayDates = new Set((holidays ?? []).map((h) => h.date));

    const { data: manual } = await supabase
      .from("attendance_manual")
      .select("employee_id, attendance_date, status, in_time, out_time")
      .gte("attendance_date", start)
      .lte("attendance_date", end);

    const { data: punches } = await supabase
      .from("attendance_punches")
      .select("employee_id, punch_date, punch_type, punch_time, is_late, is_early_departure")
      .gte("punch_date", start)
      .lte("punch_date", end);

    const { data: approved } = await supabase
      .from("attendance_approved")
      .select("employee_id, attendance_date, status, in_time, out_time")
      .eq("month_year", monthYear);

    const { data: monthApproval } = await supabase
      .from("attendance_month_approvals")
      .select("id, approved_at")
      .eq("month_year", monthYear)
      .maybeSingle();

    const approvedMap = new Map<string, { status: string; in_time?: string; out_time?: string }>();
    (approved ?? []).forEach((a) => {
      approvedMap.set(`${a.employee_id}-${a.attendance_date}`, {
        status: a.status,
        in_time: a.in_time ?? undefined,
        out_time: a.out_time ?? undefined,
      });
    });

    const workingDays = (() => {
      let count = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
      }
      return count;
    })();

    const dailyData: Record<string, { empId: string; empName: string; date: string; status: string; in_time?: string; out_time?: string; source: string }[]> = {};

    for (const emp of employees ?? []) {
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);

        let status = "absent";
        let in_time: string | undefined;
        let out_time: string | undefined;
        let source = "default";

        if (isHoliday) {
          status = "holiday";
          source = "holiday";
        } else if (isWeekend) {
          status = "week_off";
          source = "weekend";
        } else {
          const approvedKey = `${emp.id}-${dStr}`;
          const approvedEntry = approvedMap.get(approvedKey);
          if (approvedEntry) {
            status = approvedEntry.status;
            in_time = approvedEntry.in_time;
            out_time = approvedEntry.out_time;
            source = "approved";
          } else {
            const manEntry = (manual ?? []).find((m) => m.employee_id === emp.id && m.attendance_date === dStr);
            if (manEntry) {
              status = manEntry.status;
              in_time = manEntry.in_time ?? undefined;
              out_time = manEntry.out_time ?? undefined;
              source = "manual";
            } else {
              const punchIn = (punches ?? []).find((p) => p.employee_id === emp.id && p.punch_date === dStr && p.punch_type === "IN");
              const punchOut = (punches ?? []).find((p) => p.employee_id === emp.id && p.punch_date === dStr && p.punch_type === "OUT");
              if (punchIn) {
                status = "present";
                in_time = punchIn.punch_time ? new Date(punchIn.punch_time).toTimeString().slice(0, 8) : undefined;
                out_time = punchOut?.punch_time ? new Date(punchOut.punch_time).toTimeString().slice(0, 8) : undefined;
                source = "biometric";
              }
            }
          }
        }

        if (!dailyData[dStr]) dailyData[dStr] = [];
        dailyData[dStr].push({
          empId: emp.id,
          empName: emp.full_name,
          date: dStr,
          status,
          in_time,
          out_time,
          source,
        });
      }
    }

    const presentCounts: Record<string, number> = {};
    (employees ?? []).forEach((e) => {
      presentCounts[e.id] = 0;
    });
    Object.values(dailyData).forEach((dayRows) => {
      dayRows.forEach((r) => {
        if (r.status === "present" || r.status === "half_day") {
          presentCounts[r.empId] = (presentCounts[r.empId] ?? 0) + 1;
        }
      });
    });

    return NextResponse.json({
      monthYear,
      workingDays,
      isApproved: !!monthApproval,
      approvedAt: monthApproval?.approved_at,
      employees: (employees ?? []).map((e) => ({
        id: e.id,
        full_name: e.full_name,
        presentDays: presentCounts[e.id] ?? 0,
      })),
      dailyData: Object.entries(dailyData).map(([date, rows]) => ({ date, rows })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, monthYear, updates, remarks } = body as {
      action: "save" | "approve";
      monthYear?: string;
      updates?: { employee_id: string; attendance_date: string; status: string; in_time?: string; out_time?: string }[];
      remarks?: string;
    };

    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "save" && Array.isArray(updates)) {
      for (const u of updates) {
        await supabase.from("attendance_approved").upsert(
          {
            employee_id: u.employee_id,
            attendance_date: u.attendance_date,
            status: u.status,
            in_time: u.in_time || null,
            out_time: u.out_time || null,
            month_year: monthYear,
            approved_by: user.id,
            remarks: remarks || null,
          },
          { onConflict: "employee_id,attendance_date" }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "approve") {
      const { error } = await supabase.from("attendance_month_approvals").upsert(
        {
          month_year: monthYear,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          remarks: remarks || null,
        },
        { onConflict: "month_year" }
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
