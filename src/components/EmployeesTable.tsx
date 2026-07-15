"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreVertical, Pencil, Users, X } from "lucide-react";
import { EmployeeEditDialog } from "@/components/EmployeeEditDialog";
import { EmployeeViewDialog } from "@/components/EmployeeViewDialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computeEmployeeCompleteness, completenessBadgeClassNames } from "@/lib/master-data-completeness";
import { EMPLOYEE_ROLES, EMPLOYEE_TYPES } from "@/lib/lov";
import { hasShiftTimes, shiftTimesLabel } from "@/lib/employee-shift";

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
  employee_type?: string | null;
  joining_date?: string | null;
  status?: string | null;
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
  biometric_enroll_no?: string | null;
};

function parseEmployeeIdNum(id?: string | null): number {
  const n = parseInt(id ?? "", 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

type SortKey = "employee_id" | "bio_enroll_no" | "full_name" | "email" | "shift" | "status" | "data_pct";
type SortDir = "asc" | "desc";
type CompletenessFilter = "all" | "complete" | "incomplete";

function capLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

export function EmployeesTable({
  employees,
  canEdit,
}: {
  employees: StaffTableEmployee[];
  canEdit: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("employee_id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedEmployee, setSelectedEmployee] = useState<StaffTableEmployee | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [roleFilter, setRoleFilter] = useState("all");
  const [shiftTimesFilter, setShiftTimesFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [completenessFilter, setCompletenessFilter] = useState<CompletenessFilter>("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    statusFilter !== "active" ||
    roleFilter !== "all" ||
    shiftTimesFilter !== "all" ||
    typeFilter !== "all" ||
    completenessFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("active");
    setRoleFilter("all");
    setShiftTimesFilter("all");
    setTypeFilter("all");
    setCompletenessFilter("all");
  };

  const filteredEmployees = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return employees.filter((e) => {
      if (statusFilter !== "all" && (e.status ?? "active") !== statusFilter) return false;
      if (roleFilter !== "all" && (e.role ?? "") !== roleFilter) return false;
      if (shiftTimesFilter === "configured" && !hasShiftTimes(e)) return false;
      if (shiftTimesFilter === "missing" && hasShiftTimes(e)) return false;
      if (typeFilter !== "all" && (e.employee_type ?? "") !== typeFilter) return false;
      if (completenessFilter !== "all") {
        const pct = computeEmployeeCompleteness(e as unknown as Record<string, unknown>).percent;
        if (completenessFilter === "complete" && pct < 80) return false;
        if (completenessFilter === "incomplete" && pct >= 80) return false;
      }
      if (q) {
        const haystack = [
          e.full_name,
          e.email,
          e.employee_id,
          e.phone_number,
          e.aadhaar,
          e.biometric_enroll_no,
          shiftTimesLabel(e),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [employees, debouncedSearch, statusFilter, roleFilter, shiftTimesFilter, typeFilter, completenessFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "employee_id":
          av = parseEmployeeIdNum(a.employee_id);
          bv = parseEmployeeIdNum(b.employee_id);
          break;
        case "bio_enroll_no":
          av = (a.biometric_enroll_no ?? "").toLowerCase();
          bv = (b.biometric_enroll_no ?? "").toLowerCase();
          break;
        case "full_name":
          av = (a.full_name ?? "").toLowerCase();
          bv = (b.full_name ?? "").toLowerCase();
          break;
        case "email":
          av = (a.email ?? "").toLowerCase();
          bv = (b.email ?? "").toLowerCase();
          break;
        case "shift":
          av = shiftTimesLabel(a).toLowerCase();
          bv = shiftTimesLabel(b).toLowerCase();
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
  }, [filteredEmployees, sortDir, sortKey]);

  const exportRows = useMemo(
    () =>
      sortedEmployees.map((e) => ({
        employee_id: e.employee_id ?? "—",
        biometric_enroll_no: e.biometric_enroll_no ?? "—",
        full_name: e.full_name ?? "—",
        email: e.email ?? "—",
        shift: shiftTimesLabel(e),
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
      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
          <div className="space-y-1 w-full min-w-0 lg:col-span-2">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Input
                placeholder="Name, Emp ID, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pr-8"
              />
              {search !== debouncedSearch && (
                <div className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              )}
            </div>
          </div>
          <div className="space-y-1 w-full min-w-0">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-full min-w-0">
            <Label className="text-xs">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {EMPLOYEE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{capLabel(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-full min-w-0">
            <Label className="text-xs">Shift times</Label>
            <Select value={shiftTimesFilter} onValueChange={setShiftTimesFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="configured">Configured</SelectItem>
                <SelectItem value="missing">Not set</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-full min-w-0">
            <Label className="text-xs">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {EMPLOYEE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{capLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Data profile</Label>
            <Select value={completenessFilter} onValueChange={(v) => setCompletenessFilter(v as CompletenessFilter)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All profiles</SelectItem>
                <SelectItem value="complete">Complete (80%+)</SelectItem>
                <SelectItem value="incomplete">Needs data (&lt;80%)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Showing {sortedEmployees.length} of {employees.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
            <EmployeesExportButtons rows={exportRows} />
          </div>
        </div>
      </div>

      {sortedEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-dashed rounded-lg bg-muted/10">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">No employees found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            No staff match your current search or filters. Try adjusting the criteria.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-6" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground w-[90px]"
                onClick={() => handleSort("employee_id")}
              >
                <span className="inline-flex items-center gap-1">
                  Emp ID <SortIcon col="employee_id" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground w-[110px]"
                onClick={() => handleSort("bio_enroll_no")}
              >
                <span className="inline-flex items-center gap-1">
                  Bio Enroll # <SortIcon col="bio_enroll_no" />
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
                className="cursor-pointer select-none hover:text-foreground w-[130px]"
                onClick={() => handleSort("shift")}
              >
                <span className="inline-flex items-center gap-1">
                  Shift times <SortIcon col="shift" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground w-[100px]"
                onClick={() => handleSort("status")}
              >
                <span className="inline-flex items-center gap-1">
                  Status <SortIcon col="status" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground text-center w-[100px]"
                onClick={() => handleSort("data_pct")}
              >
                <span className="inline-flex items-center gap-1">
                  Data&nbsp;% <SortIcon col="data_pct" />
                </span>
              </TableHead>
              <TableHead className="text-right w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEmployees.map((e) => {
              const shiftLabel = shiftTimesLabel(e);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_id ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.biometric_enroll_no ?? "—"}</TableCell>
                  <TableCell className="font-medium max-w-[150px] truncate" title={e.full_name}>{e.full_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate" title={e.email ?? ""}>{e.email ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-[130px] truncate" title={shiftLabel}>{shiftLabel}</TableCell>
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => {
                            setSelectedEmployee(e);
                            setViewOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>View Employee Details</span>
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => {
                              setSelectedEmployee(e);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}

      {selectedEmployee && (
        <EmployeeViewDialog
          employee={selectedEmployee}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      )}

      {selectedEmployee && canEdit && (
        <EmployeeEditDialog
          employee={selectedEmployee}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
