import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { dayWeight, computeWorkingDays } from "@/lib/attendance";

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

    const [y, m] = monthYear.split("-");
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

    const { data: finalized } = await supabase
      .from("employee_attendance_finalized")
      .select("employee_id, attendance_date, status")
      .eq("month_year", monthYear);

    // If there is no finalized data for the month, it hasn't been finalized.
    // (Assuming at least one employee has data if it was finalized).
    if (!finalized || finalized.length === 0) {
      return NextResponse.json({ error: "Attendance for this month must be Finalized on the Review screen before generating payroll." }, { status: 400 });
    }

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, monthly_salary, bank_name, account_number, ifsc_code, account_holder_name")
      .eq("status", "active");

    const { data: settings } = await supabase
      .from("payroll_settings")
      .select(
        "full_day_hours, half_day_hours, debit_account_number, transaction_type, currency, remarks_prefix, custom_header_1, custom_header_2, custom_header_3, custom_header_4, custom_header_5"
      )
      .eq("id", 1)
      .maybeSingle();

    const { data: holidays } = await supabase
      .from("holidays")
      .select("date")
      .gte("date", start)
      .lte("date", end);
    const holidayDates = new Set((holidays ?? []).map((h) => h.date));

    const workingDays = computeWorkingDays(y, m, lastDay, holidayDates);

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

    const finalizedMap = new Map<string, string>();
    finalized.forEach(f => finalizedMap.set(`${f.employee_id}-${f.attendance_date}`, f.status));

    const rows: { employee_id: string; full_name: string; present_days: number; salary: number; gross_amount: number; deductions: number; net_amount: number; bank?: typeof bankMap extends Map<string, infer V> ? V : never }[] = [];

    for (const emp of employees ?? []) {
      let presentDays = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(`${dStr}T12:00:00`).getDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayDates.has(dStr);
        if (isHoliday || isWeekend) continue;

        const status = finalizedMap.get(`${emp.id}-${dStr}`);
        presentDays += dayWeight(status);
      }

      const baseSalary = Number(emp.monthly_salary ?? 0);
      const proratedBasic = workingDays > 0 ? (baseSalary / workingDays) * presentDays : 0;
      const allowances = 0;
      const grossAmount = Math.round((proratedBasic + allowances) * 100) / 100;
      const deductions = 0;
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

      const aoa: (string | number)[][] = [];
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

      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const path = await import("path");
      
      const templatePath = path.join(process.cwd(), "public", "templates", "BLKPAY_TEMPLATE.xlsx");
      await workbook.xlsx.readFile(templatePath);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error("Template worksheet not found");
      }
      
      for (const row of aoa) {
        worksheet.addRow(row);
      }

      const outBuffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(new Uint8Array(outBuffer as ArrayBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="BLKPAY_${fileStamp}.xlsx"`,
        },
      });
    }

    if (format === "neft") {
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
