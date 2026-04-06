"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { ExcelIcon, PdfIcon } from "@/components/ui/export-icons";

type EmployeeExportRow = {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  shift: string;
  status: string;
};

export function EmployeesExportButtons({ rows }: { rows: EmployeeExportRow[] }) {
  const downloadExcel = async () => {
    if (!rows.length) return;
    const XLSX = await import("xlsx");
    const exportRows = rows.map((r) => ({
      "Emp ID": r.employee_id,
      Name: r.full_name,
      Email: r.email,
      Department: r.department,
      Shift: r.shift,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 30 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
    ];
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
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Employees Report", 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Emp ID", "Name", "Email", "Department", "Shift", "Status"]],
      body: rows.map((r) => [r.employee_id, r.full_name, r.email, r.department, r.shift, r.status]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
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
