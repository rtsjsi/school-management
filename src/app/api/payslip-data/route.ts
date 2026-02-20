import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface PayslipRow {
  employee_id: string;
  employee_code: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  month_year: string;
  working_days: number;
  present_days: number;
  gross_amount: number;
  allowances: number;
  allowance_items: { type: string; amount: number; label: string }[];
  deduction_items: { type: string; amount: number; label: string }[];
  deductions: number;
  net_amount: number;
  bank?: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get("monthYear");
    const employeeId = searchParams.get("employeeId");

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
      return NextResponse.json(
        { error: "Attendance for this month must be approved before generating payslips." },
        { status: 400 }
      );
    }

    const [y, m] = monthYear.split("-");
    const start = `${y}-${m}-01`;
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

    let employeesQuery = supabase
      .from("employees")
      .select("id, full_name, employee_id, designation, department, joining_date, monthly_salary")
      .eq("status", "active");

    if (employeeId) {
      employeesQuery = employeesQuery.eq("id", employeeId);
    }

    const { data: employees } = await employeesQuery;

    const { data: bankAccounts } = await supabase
      .from("employee_bank_accounts")
      .select("employee_id, account_number, ifsc_code, account_holder_name, bank_name")
      .eq("is_primary", true);

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
    (approved ?? []).forEach((a) =>
      approvedMap.set(`${a.employee_id}-${a.attendance_date}`, a.status)
    );

    const workingDays = (() => {
      let count = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dStr = `${y}-${m}-${String(d).padStart(2, "0")}`;
        const day = new Date(dStr).getDay();
        if (day !== 0 && day !== 6 && !holidayDates.has(dStr)) count++;
      }
      return count;
    })();

    const bankMap = new Map<
      string,
      { account_number: string; ifsc_code: string; account_holder_name: string; bank_name: string }
    >();
    (bankAccounts ?? []).forEach((b) => {
      bankMap.set(b.employee_id, {
        account_number: b.account_number,
        ifsc_code: b.ifsc_code ?? "",
        account_holder_name: b.account_holder_name ?? "",
        bank_name: b.bank_name ?? "",
      });
    });

    const { data: deductionItems } = await supabase
      .from("salary_deduction_items")
      .select("employee_id, deduction_type, amount")
      .eq("month_year", monthYear);

    const { data: allowanceItems } = await supabase
      .from("salary_allowance_items")
      .select("employee_id, allowance_type, amount")
      .eq("month_year", monthYear);

    const deductionMap = new Map<string, { type: string; amount: number; label: string }[]>();
    (deductionItems ?? []).forEach((d) => {
      const key = d.employee_id;
      const list = deductionMap.get(key) ?? [];
      const label =
        d.deduction_type === "pf"
          ? "Provident Fund"
          : d.deduction_type === "tds"
            ? "TDS"
            : d.deduction_type === "advance"
              ? "Advance"
              : "Other";
      list.push({ type: d.deduction_type, amount: Number(d.amount), label });
      deductionMap.set(key, list);
    });

    const allowanceMap = new Map<string, number>();
    const allowanceItemsMap = new Map<string, { type: string; amount: number; label: string }[]>();
    (allowanceItems ?? []).forEach((a) => {
      const key = a.employee_id;
      allowanceMap.set(key, (allowanceMap.get(key) ?? 0) + Number(a.amount));
      const list = allowanceItemsMap.get(key) ?? [];
      const label =
        a.allowance_type === "hra"
          ? "House Rent Allowance"
          : a.allowance_type === "transport"
            ? "Transport Allowance"
            : a.allowance_type === "medical"
              ? "Medical Allowance"
              : "Other Allowance";
      list.push({ type: a.allowance_type, amount: Number(a.amount), label });
      allowanceItemsMap.set(key, list);
    });

    const rows: PayslipRow[] = [];

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
        const manEntry = (manual ?? []).find(
          (m) => m.employee_id === emp.id && m.attendance_date === dStr
        );
        if (manEntry && (manEntry.status === "present" || manEntry.status === "half_day")) {
          presentDays++;
          continue;
        }
        const punchIn = (punches ?? []).find(
          (p) =>
            p.employee_id === emp.id && p.punch_date === dStr && p.punch_type === "IN"
        );
        if (punchIn) presentDays++;
      }

      const baseSalary = Number(emp.monthly_salary ?? 0);
      const proratedBasic =
        workingDays > 0 ? (baseSalary / workingDays) * presentDays : 0;
      const allowances = allowanceMap.get(emp.id) ?? 0;
      const grossAmount = Math.round((proratedBasic + allowances) * 100) / 100;
      const deductionList = deductionMap.get(emp.id) ?? [];
      const totalDeductions = deductionList.reduce((s, d) => s + d.amount, 0);
      const netAmount = Math.round((grossAmount - totalDeductions) * 100) / 100;
      const bank = bankMap.get(emp.id);

      rows.push({
        employee_id: emp.id,
        employee_code: emp.employee_id ?? "—",
        full_name: emp.full_name,
        designation: emp.designation ?? null,
        department: emp.department ?? null,
        joining_date: emp.joining_date ?? null,
        month_year: monthYear,
        working_days: workingDays,
        present_days: presentDays,
        gross_amount: proratedBasic,
        allowances,
        allowance_items: allowanceItemsMap.get(emp.id) ?? [],
        deduction_items: deductionList,
        deductions: totalDeductions,
        net_amount: netAmount,
        bank: bank
          ? {
              bank_name: bank.bank_name,
              account_number: bank.account_number,
              ifsc_code: bank.ifsc_code,
              account_holder_name: bank.account_holder_name,
            }
          : undefined,
      });
    }

    return NextResponse.json({
      monthYear,
      workingDays,
      rows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch payslip data" }, { status: 500 });
  }
}
