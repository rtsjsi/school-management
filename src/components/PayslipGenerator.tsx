"use client";

import { useState, useEffect } from "react";
import { generatePayslipPDF } from "@/lib/payslip-pdf";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, Printer, AlertCircle } from "lucide-react";
import type { PayslipRow } from "@/app/api/payslip-data/route";

const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School";
const schoolAddress = process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "";

function downloadPayslip(row: PayslipRow) {
  const pdfBlob = generatePayslipPDF({
    employee_code: row.employee_code,
    full_name: row.full_name,
    designation: row.designation,
    department: row.department,
    joining_date: row.joining_date,
    month_year: row.month_year,
    working_days: row.working_days,
    present_days: row.present_days,
    gross_amount: row.gross_amount,
    allowances: row.allowances,
    allowance_items: row.allowance_items,
    deduction_items: row.deduction_items,
    deductions: row.deductions,
    net_amount: row.net_amount,
    bank: row.bank,
    schoolName,
    schoolAddress,
  });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payslip_${row.employee_code}_${row.month_year}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printPayslip(row: PayslipRow) {
  const pdfBlob = generatePayslipPDF({
    employee_code: row.employee_code,
    full_name: row.full_name,
    designation: row.designation,
    department: row.department,
    joining_date: row.joining_date,
    month_year: row.month_year,
    working_days: row.working_days,
    present_days: row.present_days,
    gross_amount: row.gross_amount,
    allowances: row.allowances,
    allowance_items: row.allowance_items,
    deduction_items: row.deduction_items,
    deductions: row.deductions,
    net_amount: row.net_amount,
    bank: row.bank,
    schoolName,
    schoolAddress,
  });
  const url = URL.createObjectURL(pdfBlob);
  const w = window.open(url, "_blank");
  if (w) w.onload = () => w.print();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function PayslipGenerator() {
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{
    monthYear: string;
    workingDays: number;
    rows: PayslipRow[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/payslip-data?monthYear=${monthYear}`)
      .then((r) => {
        if (!r.ok)
          return r.json().then((d) => {
            throw new Error(d.error ?? "Failed");
          });
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [monthYear]);

  const downloadAll = () => {
    if (!data?.rows?.length) return;
    data.rows.forEach((row, i) => {
      setTimeout(() => downloadPayslip(row), i * 300);
    });
  };

  const printAll = () => {
    if (!data?.rows?.length) return;
    data.rows.forEach((row, i) => {
      setTimeout(() => printPayslip(row), i * 800);
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div className="space-y-2">
            <Label>Month</Label>
            <Input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          {data && data.rows.length > 0 && (
            <>
              <Button variant="outline" onClick={downloadAll}>
                <FileDown className="h-4 w-4 mr-2" />
                Download All
              </Button>
              <Button variant="outline" onClick={printAll}>
                <Printer className="h-4 w-4 mr-2" />
                Print All
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Working days: {data.workingDays} | Employees: {data.rows.length}
            </p>
            {data.rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow key={r.employee_id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.employee_code}
                      </TableCell>
                      <TableCell>{r.designation ?? "—"}</TableCell>
                      <TableCell>
                        {r.present_days} / {r.working_days}
                      </TableCell>
                      <TableCell>{r.gross_amount.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {r.net_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadPayslip(r)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => printPayslip(r)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No employees found for this month.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
