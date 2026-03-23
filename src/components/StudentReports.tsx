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
  [key: string]: unknown;
  id: string;
  gr_number?: string | null;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  standard?: string | null;
  division?: string | null;
  roll_number?: number | null;
  admission_date?: string | null;
  status?: string | null;
  category?: string | null;
  religion?: string | null;
  caste?: string | null;
  aadhar_no?: string | null;
  pen_no?: string | null;
  apaar_id?: string | null;
  udise_id?: string | null;
  parent_name?: string | null;
  parent_contact?: string | null;
  parent_email?: string | null;
  mother_name?: string | null;
  mother_contact?: string | null;
  father_name?: string | null;
  guardian_name?: string | null;
  guardian_contact?: string | null;
  guardian_email?: string | null;
  present_address_line1?: string | null;
  present_address_line2?: string | null;
  present_city?: string | null;
  present_taluka?: string | null;
  present_district?: string | null;
  present_state?: string | null;
  present_pincode?: string | null;
  present_country?: string | null;
  fee_concession_amount?: number | null;
  fee_concession_reason?: string | null;
  second_language?: string | null;
  mother_tongue?: string | null;
  is_rte_quota?: boolean | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
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
        .select("*")
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

  const exportRows = () => {
    const toLabel = (key: string) =>
      key
        .split("_")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
        .join(" ");

    const normalizeExportValue = (value: unknown): string | number | boolean => {
      if (value === null || value === undefined) return "";
      if (typeof value === "boolean" || typeof value === "number") return value;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "string") return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    const exportColumns = Array.from(
      filteredRows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b));

    const exportRowsFull = filteredRows.map((row) => {
      const out: Record<string, string | number | boolean> = {};
      for (const col of exportColumns) {
        out[toLabel(col)] = normalizeExportValue(row[col]);
      }
      return out;
    });

    const reportRows = filteredRows.map((r) => ({
      "Student Name": r.full_name,
      Standard: r.standard ?? "",
      Division: r.division ?? "",
      "Roll No": r.roll_number ?? "",
      "GR No": r.gr_number ?? "",
      "RTE Flag": r.is_rte_quota ? "Yes" : "No",
      Status: r.status ?? "",
    }));

    if (reportRows.length === 0) {
      alert("No students match the selected filters.");
      return;
    }

    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(exportRowsFull);
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
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={exportRows}>
              <Download className="h-3 w-3" />
              Excel
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
                  <TableHead>Student Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Mother Tongue</TableHead>
                  <TableHead>Second Language</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>GR No</TableHead>
                  <TableHead>UDISE ID</TableHead>
                  <TableHead>Aadhar No</TableHead>
                  <TableHead>PEN No</TableHead>
                  <TableHead>APAAR ID</TableHead>
                  <TableHead>Father Name</TableHead>
                  <TableHead>Mother Name</TableHead>
                  <TableHead>Parent Contact</TableHead>
                  <TableHead>Parent Email</TableHead>
                  <TableHead>Guardian Name</TableHead>
                  <TableHead>Guardian Contact</TableHead>
                  <TableHead>Present Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.date_of_birth ? new Date(row.date_of_birth).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="capitalize">{row.gender ?? "—"}</TableCell>
                    <TableCell>{row.blood_group ?? "—"}</TableCell>
                    <TableCell className="uppercase">{row.category ?? "—"}</TableCell>
                    <TableCell>{row.mother_tongue ?? "—"}</TableCell>
                    <TableCell>{row.second_language ?? "—"}</TableCell>
                    <TableCell>{row.admission_date ? new Date(row.admission_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{row.standard ?? "—"}</TableCell>
                    <TableCell>{row.division ?? "—"}</TableCell>
                    <TableCell>{row.roll_number ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.gr_number ?? "—"}</TableCell>
                    <TableCell>{row.udise_id ?? "—"}</TableCell>
                    <TableCell>{row.aadhar_no ?? "—"}</TableCell>
                    <TableCell>{row.pen_no ?? "—"}</TableCell>
                    <TableCell>{row.apaar_id ?? "—"}</TableCell>
                    <TableCell>{row.father_name ?? "—"}</TableCell>
                    <TableCell>{row.mother_name ?? "—"}</TableCell>
                    <TableCell>{row.parent_contact ?? "—"}</TableCell>
                    <TableCell>{row.parent_email ?? "—"}</TableCell>
                    <TableCell>{row.guardian_name ?? "—"}</TableCell>
                    <TableCell>{row.guardian_contact ?? "—"}</TableCell>
                    <TableCell>{row.present_address_line1 ?? "—"}</TableCell>
                    <TableCell>{row.present_city ?? "—"}</TableCell>
                    <TableCell>{row.present_district ?? "—"}</TableCell>
                    <TableCell>{row.present_state ?? "—"}</TableCell>
                    <TableCell>{row.present_pincode ?? "—"}</TableCell>
                    <TableCell>{row.is_rte_quota ? "Yes" : "No"}</TableCell>
                    <TableCell className="capitalize">{row.status ?? "—"}</TableCell>
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
