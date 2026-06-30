import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { deriveDailyStatus, dayWeight, DEFAULT_THRESHOLDS, type ShiftLite } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get("monthYear");
    const format = searchParams.get("format") ?? "json";

    if (!monthYear) {
      return NextResponse.json({ error: "monthYear required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: approval } = await supabase
      .from("employee_attendance_approvals")
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
      .select("id, full_name, monthly_salary, bank_name, account_number, ifsc_code, account_holder_name, shift_id")
      .eq("status", "active");

    const { data: shifts } = await supabase
      .from("shifts")
      .select("id, start_time, end_time, grace_period_minutes, late_threshold_minutes, early_departure_threshold_minutes");
    const shiftMap = new Map<string, ShiftLite>();
    (shifts ?? []).forEach((s) => shiftMap.set(s.id, s));

    const { data: settings } = await supabase
      .from("payroll_settings")
      .select(
        "full_day_hours, half_day_hours, debit_account_number, transaction_type, currency, remarks_prefix, custom_header_1, custom_header_2, custom_header_3, custom_header_4, custom_header_5"
      )
      .eq("id", 1)
      .maybeSingle();
    const thresholds = {
      fullDayHours: Number(settings?.full_day_hours ?? DEFAULT_THRESHOLDS.fullDayHours),
      halfDayHours: Number(settings?.half_day_hours ?? DEFAULT_THRESHOLDS.halfDayHours),
    };

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .gte("date", start)
      .lte("date", end);
    const holidayDates = new Set((holidays ?? []).map((h) => h.date));

    const { data: manual } = await supabase
      .from("employee_attendance_daily")
      .select("employee_id, attendance_date, status, is_approved")
      .gte("attendance_date", start)
      .lte("attendance_date", end);

    const { data: punches } = await supabase
      .from("employee_attendance_punches")
      .select("employee_id, punch_date, punch_type, punch_time")
      .gte("punch_date", start)
      .lte("punch_date", end);

    const { data: approved } = await supabase
      .from("employee_attendance_daily")
      .select("employee_id, attendance_date, status")
      .eq("month_year", monthYear)
      .eq("is_approved", true);

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
      const empShift = emp.shift_id ? shiftMap.get(emp.shift_id) ?? null : null;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);
        if (isHoliday || isWeekend) continue;

        // Priority: approved daily status > any saved manual entry > derived from punches.
        const approvedStatus = approvedMap.get(`${emp.id}-${dStr}`);
        if (approvedStatus) {
          presentDays += dayWeight(approvedStatus);
          continue;
        }
        const manEntry = (manual ?? []).find((mm) => mm.employee_id === emp.id && mm.attendance_date === dStr);
        if (manEntry) {
          presentDays += dayWeight(manEntry.status);
          continue;
        }
        const dayPunches = (punches ?? []).filter((p) => p.employee_id === emp.id && p.punch_date === dStr);
        if (dayPunches.length > 0) {
          const derived = deriveDailyStatus(dayPunches, empShift, thresholds);
          presentDays += dayWeight(derived.status);
        }
      }
      presentDays = Math.round(presentDays * 2) / 2;

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

    if (format === "blkpay") {
      // Inputs (from the generate form), falling back to saved defaults.
      const debitAccount = (searchParams.get("debitAccount") ?? settings?.debit_account_number ?? "").trim();
      const transactionType = (searchParams.get("transactionType") ?? settings?.transaction_type ?? "NEFT").trim().toUpperCase();
      const currency = (searchParams.get("currency") ?? settings?.currency ?? "INR").trim().toUpperCase();
      const remarksPrefix = (searchParams.get("remarksPrefix") ?? settings?.remarks_prefix ?? "Salary").trim();
      const valueDateParam = searchParams.get("valueDate");
      const valueDate = valueDateParam && /^\d{4}-\d{2}-\d{2}$/.test(valueDateParam) ? new Date(`${valueDateParam}T00:00:00`) : new Date();

      const dd = String(valueDate.getDate()).padStart(2, "0");
      const mmNum = String(valueDate.getMonth() + 1).padStart(2, "0");
      const yyyy = valueDate.getFullYear();
      const txnDate = `${dd}/${mmNum}/${yyyy}`;
      const fileStamp = `${yyyy}${mmNum}${dd}`;
      const monthLabel = new Date(`${monthYear}-01T00:00:00`).toLocaleString("en-US", { month: "short", year: "numeric" });

      // Persist the entered values as the new defaults.
      await supabase.from("payroll_settings").upsert(
        {
          id: 1,
          debit_account_number: debitAccount || null,
          transaction_type: transactionType || "NEFT",
          currency: currency || "INR",
          remarks_prefix: remarksPrefix || "Salary",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // Persist salary snapshot, same as the legacy NEFT download.
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

      const header = [
        "Beneficiary Name",
        "Beneficiary Account Number",
        "IFSC",
        "Transaction Type",
        "Debit Account Number",
        "Transaction Date",
        "Amount",
        "Currency",
        "Beneficiary Email ID",
        "Remarks",
        "Custom Header \u2013 1",
        "Custom Header \u2013 2",
        "Custom Header \u2013 3",
        "Custom Header \u2013 4",
        "Custom Header \u2013 5",
      ];

      const aoa: (string | number)[][] = [header];
      for (const r of payableRows) {
        const b = r.bank!;
        aoa.push([
          b.account_holder_name || r.full_name,
          b.account_number,
          b.ifsc_code,
          transactionType,
          debitAccount,
          txnDate,
          Number(r.net_amount.toFixed(2)),
          currency,
          "",
          `${remarksPrefix} ${monthLabel}`,
          settings?.custom_header_1 ?? "",
          settings?.custom_header_2 ?? "",
          settings?.custom_header_3 ?? "",
          settings?.custom_header_4 ?? "",
          settings?.custom_header_5 ?? "",
        ]);
      }

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [
        { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
        { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 24 }, { wch: 28 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;

      return new NextResponse(new Uint8Array(out), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="BLKPAY_${fileStamp}.xlsx"`,
        },
      });
    }

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
      settings: {
        debitAccount: settings?.debit_account_number ?? "",
        transactionType: settings?.transaction_type ?? "NEFT",
        currency: settings?.currency ?? "INR",
        remarksPrefix: settings?.remarks_prefix ?? "Salary",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate NEFT" }, { status: 500 });
  }
}
