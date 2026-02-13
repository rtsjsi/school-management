"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Printer } from "lucide-react";

interface Student {
  id: string;
  student_id?: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  grade?: string;
  section?: string;
  roll_number?: number;
  status?: string;
  admission_date?: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_contact?: string;
  [key: string]: any;
}

interface StudentReportActionsProps {
  students: Student[];
}

export function StudentReportActions({ students }: StudentReportActionsProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      // Define CSV headers
      const headers = [
        "Student ID",
        "Full Name",
        "Email",
        "Phone",
        "Grade",
        "Section",
        "Roll Number",
        "Status",
        "Admission Date",
        "Date of Birth",
        "Parent Name",
        "Parent Contact",
      ];

      // Map data to CSV rows
      const rows = students.map((s) => [
        s.student_id || "",
        s.full_name,
        s.email || "",
        s.phone_number || "",
        s.grade || "",
        s.section || "",
        s.roll_number || "",
        s.status || "active",
        s.admission_date ? new Date(s.admission_date).toLocaleDateString() : "",
        s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : "",
        s.parent_name || "",
        s.parent_contact || "",
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              // Escape quotes and wrap in quotes if contains comma
              const stringCell = String(cell);
              return stringCell.includes(",") || stringCell.includes('"')
                ? `"${stringCell.replace(/"/g, '""')}"`
                : stringCell;
            })
            .join(",")
        ),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `students_report_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please disable popup blocker");
      return;
    }

    // Create HTML table
    const tableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; color: #1F4E78; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #1F4E78; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .total { font-weight: bold; margin-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Student Report - ${new Date().toLocaleDateString()}</h1>
        <p><strong>Total Students:</strong> ${students.length}</p>
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Grade</th>
              <th>Section</th>
              <th>Roll #</th>
              <th>Status</th>
              <th>Admission Date</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map(
                (s) => `
              <tr>
                <td>${s.student_id || ""}</td>
                <td>${s.full_name}</td>
                <td>${s.email || ""}</td>
                <td>${s.grade || ""}</td>
                <td>${s.section || ""}</td>
                <td>${s.roll_number || ""}</td>
                <td>${s.status || "active"}</td>
                <td>${
                  s.admission_date
                    ? new Date(s.admission_date).toLocaleDateString()
                    : ""
                }</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="total">
          <p>Total Students: ${students.length}</p>
          <p>Report Generated: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={exportToCSV}
        disabled={exporting || students.length === 0}
        className="gap-1"
      >
        <FileDown className="h-4 w-4" />
        Export CSV
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handlePrint}
        disabled={students.length === 0}
        className="gap-1"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
