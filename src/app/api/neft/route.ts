import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get("monthYear");
    const format = searchParams.get("format") ?? "json";

    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: approval } = await supabase
      .from("attendance_month_approvals")
      .select("id")
      .eq("month_year", monthYear)
      .maybeSingle();

    if (!approval) {
      return NextResponse.json({ error: "Attendance for this month must be approved before generating NEFT file." }, { status: 400 });
    }

    const [y, m] = monthYear.split("-");
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, monthly_salary, bank_name, account_number, ifsc_code, account_holder_name")
      .eq("status", "active");

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .gte("date", start)
      .lte("date", end);
    const holidayDates = new Set((holidays ?? []).map((h) => h.date));

    const { data: manual } = await supabase
      .from("attendance_manual")
      .select("employee_id, attendance_date, status")
      .gte("attendance_date", start)
      .lte("attendance_date", end);

    const { data: punches } = await supabase
      .from("attendance_punches")
      .select("employee_id, punch_date, punch_type")
      .gte("punch_date", start)
      .lte("punch_date", end);

    const { data: approved } = await supabase
      .from("attendance_approved")
      .select("employee_id, attendance_date, status")
      .eq("month_year", monthYear);

    const approvedMap = new Map<string, string>();
    (approved ?? []).forEach((a) => approvedMap.set(`${a.employee_id}-${a.attendance_date}`, a.status));

    const workingDays = (() => {
      let count = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
      }
      return count;
    })();

    const bankMap = new Map<string, { account_number: string; ifsc_code: string; account_holder_name: string; bank_name: string }>();
    (employees ?? []).forEach((e) => {
      if (!e.account_number || !e.bank_name) return;
      bankMap.set(e.id, {
        account_number: e.account_number,
        ifsc_code: e.ifsc_code ?? "",
        account_holder_name: e.account_holder_name ?? e.full_name,
        bank_name: e.bank_name ?? "",
      });
    });

    const { data: deductionItems } = await supabase
      .from("salary_deduction_items")
      .select("employee_id, amount")
      .eq("month_year", monthYear);

    const { data: allowanceItems } = await supabase
      .from("salary_allowance_items")
      .select("employee_id, amount")
      .eq("month_year", monthYear);

    const deductionMap = new Map<string, number>();
    (deductionItems ?? []).forEach((d) => {
      deductionMap.set(d.employee_id, (deductionMap.get(d.employee_id) ?? 0) + Number(d.amount));
    });

    const allowanceMap = new Map<string, number>();
    (allowanceItems ?? []).forEach((a) => {
      allowanceMap.set(a.employee_id, (allowanceMap.get(a.employee_id) ?? 0) + Number(a.amount));
    });

    const rows: { employee_id: string; full_name: string; present_days: number; salary: number; gross_amount: number; deductions: number; net_amount: number; bank?: typeof bankMap extends Map<string, infer V> ? V : never }[] = [];

    for (const emp of employees ?? []) {
      let presentDays = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);
        if (isHoliday || isWeekend) continue;

        const approvedKey = `${emp.id}-${dStr}`;
        const approvedStatus = approvedMap.get(approvedKey);
        if (approvedStatus && (approvedStatus === "present" || approvedStatus === "half_day")) {
          presentDays++;
          continue;
        }
        const manEntry = (manual ?? []).find((m) => m.employee_id === emp.id && m.attendance_date === dStr);
        if (manEntry && (manEntry.status === "present" || manEntry.status === "half_day")) {
          presentDays++;
          continue;
        }
        const punchIn = (punches ?? []).find((p) => p.employee_id === emp.id && p.punch_date === dStr && p.punch_type === "IN");
        if (punchIn) presentDays++;
      }

      const baseSalary = Number(emp.monthly_salary ?? 0);
      const proratedBasic = workingDays > 0 ? (baseSalary / workingDays) * presentDays : 0;
      const allowances = allowanceMap.get(emp.id) ?? 0;
      const grossAmount = Math.round((proratedBasic + allowances) * 100) / 100;
      const deductions = deductionMap.get(emp.id) ?? 0;
      const netAmount = Math.round((grossAmount - deductions) * 100) / 100;
      const bank = bankMap.get(emp.id);

      rows.push({
        employee_id: emp.id,
        full_name: emp.full_name,
        present_days: presentDays,
        salary: baseSalary,
        gross_amount: grossAmount,
        deductions,
        net_amount: netAmount,
        bank,
      });
    }

    const payableRows = rows.filter((r) => r.net_amount > 0 && r.bank);

    if (format === "neft") {
      // Persist to employee_salaries when generating NEFT
      const now = new Date().toISOString();
      for (const r of rows) {
        await supabase.from("employee_salaries").upsert(
          {
            employee_id: r.employee_id,
            month_year: monthYear,
            gross_amount: r.gross_amount,
            deductions: r.deductions,
            net_amount: r.net_amount,
            status: r.net_amount > 0 && r.bank ? "approved" : "pending",
            neft_generated_at: r.net_amount > 0 && r.bank ? now : null,
            updated_at: now,
          },
          { onConflict: "employee_id,month_year" }
        );
      }

      const lines: string[] = [];
      lines.push("NEFT Payment File");
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push(`Month: ${monthYear}`);
      lines.push("");
      lines.push("Account Number|IFSC|Account Holder|Amount|Remarks");
      payableRows.forEach((r) => {
        const b = r.bank!;
        lines.push(`${b.account_number}|${b.ifsc_code}|${b.account_holder_name}|${r.net_amount.toFixed(2)}|Salary ${monthYear} - ${r.full_name}`);
      });
      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="neft_${monthYear}.txt"`,
        },
      });
    }

    return NextResponse.json({
      monthYear,
      workingDays,
      rows: payableRows,
      skipped: rows.filter((r) => r.net_amount <= 0 || !r.bank),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate NEFT" }, { status: 500 });
  }
}
