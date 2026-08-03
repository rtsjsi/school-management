"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { ExcelIcon, PdfIcon } from "@/components/ui/export-icons";
import { formatTimeShort, shiftTimesLabel } from "@/lib/employee-shift";

export type EmployeeMasterExportRow = {
  employee_id?: string | null;
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  aadhaar?: string | null;
  pan?: string | null;
  role?: string | null;
  employee_type?: string | null;
  joining_date?: string | null;
  status?: string | null;
  enable_payroll?: boolean | null;
  enable_sandwich_policy?: boolean | null;
  basic_salary?: number | null;
  other_allowance?: number | null;
  child_allowance?: number | null;
  casual_leave_balance?: number | null;
  monthly_salary?: number | null;
  degree?: string | null;
  institution?: string | null;
  year_passed?: number | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder_name?: string | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  biometric_enroll_no?: number | null;
};

function dash(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? t : "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value);
}

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function capLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

const EXPORT_COLUMNS: { key: string; header: string; width: number }[] = [
  { key: "employee_id", header: "Emp ID", width: 10 },
  { key: "biometric_enroll_no", header: "Bio Enroll #", width: 12 },
  { key: "full_name", header: "Name", width: 22 },
  { key: "email", header: "Email", width: 26 },
  { key: "phone_number", header: "Phone", width: 14 },
  { key: "address", header: "Address", width: 28 },
  { key: "aadhaar", header: "Aadhaar", width: 14 },
  { key: "pan", header: "PAN", width: 12 },
  { key: "role", header: "Role", width: 12 },
  { key: "employee_type", header: "Employee Type", width: 14 },
  { key: "joining_date", header: "Joining Date", width: 12 },
  { key: "status", header: "Status", width: 10 },
  { key: "enable_payroll", header: "Enable Payroll", width: 12 },
  { key: "enable_sandwich_policy", header: "Enable Sandwich Policy", width: 16 },
  { key: "shift_start", header: "Shift Start", width: 11 },
  { key: "shift_end", header: "Shift End", width: 11 },
  { key: "shift_times", header: "Shift Times", width: 14 },
  { key: "basic_salary", header: "Basic Salary", width: 12 },
  { key: "other_allowance", header: "Other Allowance", width: 14 },
  { key: "child_allowance", header: "Child Allowance", width: 14 },
  { key: "monthly_salary", header: "Net Salary", width: 12 },
  { key: "casual_leave_balance", header: "CL Balance", width: 10 },
  { key: "degree", header: "Degree", width: 14 },
  { key: "institution", header: "Institution", width: 20 },
  { key: "year_passed", header: "Year Passed", width: 11 },
  { key: "bank_name", header: "Bank Name", width: 16 },
  { key: "account_number", header: "Account Number", width: 16 },
  { key: "ifsc_code", header: "IFSC", width: 12 },
  { key: "account_holder_name", header: "Account Holder", width: 20 },
];

function toExportRecord(e: EmployeeMasterExportRow): Record<string, string> {
  return {
    employee_id: dash(e.employee_id),
    biometric_enroll_no: dash(e.biometric_enroll_no),
    full_name: dash(e.full_name),
    email: dash(e.email),
    phone_number: dash(e.phone_number),
    address: dash(e.address),
    aadhaar: dash(e.aadhaar),
    pan: dash(e.pan),
    role: capLabel(e.role),
    employee_type: capLabel(e.employee_type),
    joining_date: dash(e.joining_date),
    status: dash(e.status ?? "active"),
    enable_payroll: e.enable_payroll === false ? "No" : "Yes",
    enable_sandwich_policy: e.enable_sandwich_policy === false ? "No" : "Yes",
    shift_start: formatTimeShort(e.shift_start_time) || "—",
    shift_end: formatTimeShort(e.shift_end_time) || "—",
    shift_times: shiftTimesLabel(e),
    basic_salary: money(e.basic_salary),
    other_allowance: money(e.other_allowance),
    child_allowance: money(e.child_allowance),
    monthly_salary: money(e.monthly_salary),
    casual_leave_balance: dash(e.casual_leave_balance),
    degree: dash(e.degree),
    institution: dash(e.institution),
    year_passed: dash(e.year_passed),
    bank_name: dash(e.bank_name),
    account_number: dash(e.account_number),
    ifsc_code: dash(e.ifsc_code),
    account_holder_name: dash(e.account_holder_name),
  };
}

export function EmployeesExportButtons({ rows }: { rows: EmployeeMasterExportRow[] }) {
  const downloadExcel = async () => {
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const mapped = rows.map(toExportRecord);
    const exportRows = mapped.map((r) => {
      const out: Record<string, string> = {};
      for (const col of EXPORT_COLUMNS) out[col.header] = r[col.key];
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = EXPORT_COLUMNS.map((c) => ({ wch: c.width }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!rows.length) return;
    const mapped = rows.map(toExportRecord);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    doc.setFontSize(14);
    doc.text("Employees Master Extract", 14, 14);
    doc.setFontSize(9);
    doc.text(`${rows.length} employee${rows.length === 1 ? "" : "s"}`, 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [EXPORT_COLUMNS.map((c) => c.header)],
      body: mapped.map((r) => EXPORT_COLUMNS.map((c) => r[c.key])),
      styles: { fontSize: 6, cellPadding: 1.2, overflow: "linebreak" },
      headStyles: { fillColor: [220, 38, 38], fontSize: 6.5 },
      margin: { left: 8, right: 8 },
    });
    doc.save(`employees-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
        onClick={downloadPdf}
      >
        <PdfIcon className="h-4 w-4" />
        PDF
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-1.5 bg-green-700 hover:bg-green-800 text-white shadow-sm"
        onClick={downloadExcel}
      >
        <ExcelIcon className="h-4 w-4" />
        Excel
      </Button>
    </div>
  );
}
