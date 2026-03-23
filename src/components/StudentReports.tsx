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

    const addFormFieldOrder = [
      "full_name",
      "date_of_birth",
      "gender",
      "blood_group",
      "present_address_line1",
      "present_address_line2",
      "present_city",
      "present_taluka",
      "present_district",
      "present_state",
      "present_pincode",
      "present_country",
      "permanent_address_line1",
      "permanent_address_line2",
      "permanent_city",
      "permanent_taluka",
      "permanent_district",
      "permanent_state",
      "permanent_pincode",
      "permanent_country",
      "mother_tongue",
      "standard",
      "division",
      "roll_number",
      "admission_date",
      "status",
      "category",
      "religion",
      "caste",
      "birth_place",
      "last_school",
      "previous_school_address",
      "previous_school_state_unique_id",
      "birth_certificate_number",
      "aadhar_no",
      "pen_no",
      "apaar_id",
      "father_name",
      "mother_name",
      "parent_name",
      "parent_contact",
      "mother_contact",
      "parent_email",
      "guardian_name",
      "guardian_contact",
      "guardian_email",
      "emergency_contact_name",
      "emergency_contact_number",
      "fee_concession_amount",
      "fee_concession_reason",
      "height",
      "weight",
      "hobby",
      "sign_of_identity",
      "father_education",
      "father_occupation",
      "mother_education",
      "mother_occupation",
      "whatsapp_no",
      "account_holder_name",
      "bank_name",
      "bank_branch",
      "bank_ifsc",
      "account_no",
      "guardian_education",
      "guardian_occupation",
      "udise_id",
      "gr_number",
      "second_language",
      "is_rte_quota",
      "id",
      "created_at",
      "created_by",
      "updated_at",
      "updated_by",
      "exit_date",
      "exit_reason",
      "exit_notes",
    ] as const;

    const rowKeys = Array.from(
      filteredRows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    const orderedKnownKeys = addFormFieldOrder.filter((k) => rowKeys.includes(k));
    const extraKeys = rowKeys
      .filter((k) => !orderedKnownKeys.includes(k))
      .sort((a, b) => a.localeCompare(b));
    const exportColumns = [...orderedKnownKeys, ...extraKeys];

    const exportRowsFull = filteredRows.map((row) => {
      const out: Record<string, string | number | boolean> = {};
      for (const col of exportColumns) {
        out[toLabel(col)] = normalizeExportValue(row[col]);
      }
      return out;
    });

    if (filteredRows.length === 0) {
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
                  <TableHead>Standard</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>GR No</TableHead>
                  <TableHead>RTE</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.standard ?? "—"}</TableCell>
                    <TableCell>{row.division ?? "—"}</TableCell>
                    <TableCell>{row.roll_number ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.gr_number ?? "—"}</TableCell>
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
