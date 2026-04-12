"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmployeeEditDialog } from "@/components/EmployeeEditDialog";
import { EmployeesExportButtons } from "@/components/EmployeesExportButtons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { computeEmployeeCompleteness, completenessBadgeClassNames } from "@/lib/master-data-completeness";

export type StaffTableEmployee = {
  id: string;
  employee_id?: string | null;
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  aadhaar?: string | null;
  pan?: string | null;
  role?: string | null;
  department?: string | null;
  employee_type?: string | null;
  joining_date?: string | null;
  status?: string | null;
  monthly_salary?: number | null;
  degree?: string | null;
  institution?: string | null;
  year_passed?: number | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  account_holder_name?: string | null;
  shift_id?: string | null;
  shifts?: { name?: string } | { name?: string }[] | null;
};

type ShiftOption = { id: string; name: string };

function shiftNameFromRow(e: StaffTableEmployee): string {
  const shiftData = e.shifts;
  return Array.isArray(shiftData) ? shiftData[0]?.name ?? "—" : shiftData?.name ?? "—";
}

type SortKey = "employee_id" | "full_name" | "email" | "department" | "shift" | "status" | "data_pct";
type SortDir = "asc" | "desc";

export function EmployeesTable({
  employees,
  shiftList,
  canEdit,
}: {
  employees: StaffTableEmployee[];
  shiftList: ShiftOption[];
  canEdit: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!sortKey) return employees;
    return [...employees].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "employee_id":
          av = (a.employee_id ?? "").toLowerCase();
          bv = (b.employee_id ?? "").toLowerCase();
          break;
        case "full_name":
          av = (a.full_name ?? "").toLowerCase();
          bv = (b.full_name ?? "").toLowerCase();
          break;
        case "email":
          av = (a.email ?? "").toLowerCase();
          bv = (b.email ?? "").toLowerCase();
          break;
        case "department":
          av = (a.department ?? "").toLowerCase();
          bv = (b.department ?? "").toLowerCase();
          break;
        case "shift":
          av = shiftNameFromRow(a).toLowerCase();
          bv = shiftNameFromRow(b).toLowerCase();
          break;
        case "status":
          av = (a.status ?? "active").toLowerCase();
          bv = (b.status ?? "active").toLowerCase();
          break;
        case "data_pct":
          av = computeEmployeeCompleteness(a as unknown as Record<string, unknown>).percent;
          bv = computeEmployeeCompleteness(b as unknown as Record<string, unknown>).percent;
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [employees, sortDir, sortKey]);

  const exportRows = useMemo(
    () =>
      sortedEmployees.map((e) => ({
        employee_id: e.employee_id ?? "—",
        full_name: e.full_name ?? "—",
        email: e.email ?? "—",
        department: e.department ?? "—",
        shift: shiftNameFromRow(e),
        status: String(e.status ?? "active"),
      })),
    [sortedEmployees],
  );

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <EmployeesExportButtons rows={exportRows} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("employee_id")}
              >
                <span className="inline-flex items-center gap-1">
                  Emp ID <SortIcon col="employee_id" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("full_name")}
              >
                <span className="inline-flex items-center gap-1">
                  Name <SortIcon col="full_name" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("email")}
              >
                <span className="inline-flex items-center gap-1">
                  Email <SortIcon col="email" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("department")}
              >
                <span className="inline-flex items-center gap-1">
                  Department <SortIcon col="department" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("shift")}
              >
                <span className="inline-flex items-center gap-1">
                  Shift <SortIcon col="shift" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort("status")}
              >
                <span className="inline-flex items-center gap-1">
                  Status <SortIcon col="status" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground text-center"
                onClick={() => handleSort("data_pct")}
              >
                <span className="inline-flex items-center gap-1">
                  Data&nbsp;% <SortIcon col="data_pct" />
                </span>
              </TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmployees.map((e) => {
              const shiftName = shiftNameFromRow(e);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_id ?? "—"}</TableCell>
                  <TableCell className="font-medium">{e.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.email ?? "—"}</TableCell>
                  <TableCell>{e.department ?? "—"}</TableCell>
                  <TableCell>{shiftName}</TableCell>
                  <TableCell>
                    <Badge variant={(e.status as string) === "active" ? "default" : "secondary"}>
                      {e.status ?? "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const pct = computeEmployeeCompleteness(e as unknown as Record<string, unknown>).percent;
                      return (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${completenessBadgeClassNames(pct)}`}
                        >
                          {pct}%
                        </span>
                      );
                    })()}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <EmployeeEditDialog employee={e} shifts={shiftList} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
