"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StudentReportRow = {
  id: string;
  student_id?: string | null;
  full_name: string;
  standard?: string | null;
  division?: string | null;
  roll_number?: number | null;
  academic_year?: string | null;
  status?: string | null;
  is_rte_quota?: boolean | null;
};

type AllowedClassNames = { standardName: string; divisionName: string }[];

export function StudentReports({ allowedClassNames }: { allowedClassNames?: AllowedClassNames }) {
  const supabase = useMemo(() => createClient(), []);
  const restrictByClass = allowedClassNames !== undefined;
  const allowedClassPairsKey = useMemo(() => {
    if (!allowedClassNames?.length) return "";
    return allowedClassNames.map((p) => `${p.standardName}\0${p.divisionName}`).sort().join("|");
  }, [allowedClassNames]);

  const [rows, setRows] = useState<StudentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [standardFilter, setStandardFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [rteFilter, setRteFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("students")
        .select("id, student_id, full_name, standard, division, roll_number, academic_year, status, is_rte_quota")
        .order("standard", { ascending: true })
        .order("division", { ascending: true })
        .order("roll_number", { ascending: true })
        .order("full_name", { ascending: true });

      let fetched = (data ?? []) as StudentReportRow[];
      if (restrictByClass) {
        if (!allowedClassPairsKey) {
          fetched = [];
        } else {
          const allowedPairs = new Set(allowedClassPairsKey.split("|"));
          fetched = fetched.filter((s) => allowedPairs.has(`${s.standard ?? ""}\0${s.division ?? ""}`));
        }
      }
      setRows(fetched);
      setLoading(false);
    })();
  }, [supabase, restrictByClass, allowedClassPairsKey]);

  const standards = useMemo(
    () => Array.from(new Set(rows.map((r) => r.standard).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const divisions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.division).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (standardFilter !== "all" && (r.standard ?? "") !== standardFilter) return false;
      if (divisionFilter !== "all" && (r.division ?? "") !== divisionFilter) return false;
      if (rteFilter === "rte" && !r.is_rte_quota) return false;
      if (rteFilter === "non-rte" && !!r.is_rte_quota) return false;
      return true;
    });
  }, [rows, standardFilter, divisionFilter, rteFilter]);

  const exportRows = (format: "csv" | "xlsx" | "pdf") => {
    const reportRows = filteredRows.map((r) => ({
      "Student ID": r.student_id ?? "",
      Name: r.full_name,
      Standard: r.standard ?? "",
      Division: r.division ?? "",
      "Roll No": r.roll_number ?? "",
      "RTE Flag": r.is_rte_quota ? "Yes" : "No",
      Status: r.status ?? "",
      "Academic Year": r.academic_year ?? "",
    }));

    if (reportRows.length === 0) {
      alert("No students match the selected filters.");
      return;
    }

    if (format === "csv") {
      const header = Object.keys(reportRows[0]).join(",");
      const body = reportRows
        .map((row) =>
          Object.values(row)
            .map((value) => {
              const text = String(value ?? "");
              if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
                return `"${text.replace(/"/g, "\"\"")}"`;
              }
              return text;
            })
            .join(",")
        )
        .join("\n");
      const blob = new Blob(["\uFEFF" + `${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students-report.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === "xlsx") {
      import("xlsx").then((XLSX) => {
        const ws = XLSX.utils.json_to_sheet(reportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "students-report.xlsx";
        a.click();
        URL.revokeObjectURL(url);
      });
      return;
    }

    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      let y = 12;
      doc.setFontSize(14);
      doc.text("Student Report", 10, y);
      y += 8;
      doc.setFontSize(9);
      doc.text("ID", 10, y);
      doc.text("Name", 28, y);
      doc.text("Std", 95, y);
      doc.text("Div", 108, y);
      doc.text("Roll", 121, y);
      doc.text("RTE", 136, y);
      doc.text("Status", 150, y);
      doc.text("Year", 175, y);
      y += 3;
      doc.line(10, y, 286, y);
      y += 5;
      for (const row of reportRows) {
        if (y > 195) {
          doc.addPage();
          y = 12;
        }
        doc.text(String(row["Student ID"] || "—"), 10, y, { maxWidth: 16 });
        doc.text(String(row.Name || "—"), 28, y, { maxWidth: 64 });
        doc.text(String(row.Standard || "—"), 95, y, { maxWidth: 10 });
        doc.text(String(row.Division || "—"), 108, y, { maxWidth: 10 });
        doc.text(String(row["Roll No"] || "—"), 121, y, { maxWidth: 10 });
        doc.text(String(row["RTE Flag"] || "—"), 136, y, { maxWidth: 12 });
        doc.text(String(row.Status || "—"), 150, y, { maxWidth: 22 });
        doc.text(String(row["Academic Year"] || "—"), 175, y, { maxWidth: 28 });
        y += 5;
      }
      doc.save("students-report.pdf");
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[560px]">
            <div className="space-y-2">
              <Label>Standard</Label>
              <Select value={standardFilter} onValueChange={setStandardFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {standards.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>RTE Flag</Label>
              <Select value={rteFilter} onValueChange={setRteFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="rte">RTE only</SelectItem>
                  <SelectItem value="non-rte">Non-RTE only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => exportRows("csv")}>
              <Download className="h-3 w-3" />
              CSV
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => exportRows("xlsx")}>
              <Download className="h-3 w-3" />
              Excel
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => exportRows("pdf")}>
              <Download className="h-3 w-3" />
              PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading report data...</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No students match the selected filters.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Academic Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.student_id ?? "—"}</TableCell>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.standard ?? "—"}</TableCell>
                    <TableCell>{row.division ?? "—"}</TableCell>
                    <TableCell>{row.roll_number ?? "—"}</TableCell>
                    <TableCell>{row.is_rte_quota ? "Yes" : "No"}</TableCell>
                    <TableCell className="capitalize">{row.status ?? "—"}</TableCell>
                    <TableCell>{row.academic_year ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
