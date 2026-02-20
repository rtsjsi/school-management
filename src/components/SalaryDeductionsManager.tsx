"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  upsertSalaryDeduction,
  deleteSalaryDeduction,
  upsertSalaryAllowance,
  deleteSalaryAllowance,
} from "@/app/dashboard/attendance/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, AlertCircle } from "lucide-react";

const DEDUCTION_TYPES = [
  { value: "pf", label: "Provident Fund" },
  { value: "tds", label: "TDS" },
  { value: "advance", label: "Advance" },
  { value: "other", label: "Other" },
];

const ALLOWANCE_TYPES = [
  { value: "hra", label: "HRA" },
  { value: "transport", label: "Transport" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

type Employee = { id: string; full_name: string; employee_id: string | null };
type DeductionRow = {
  id: string;
  employee_id: string;
  deduction_type: string;
  amount: number;
  employees: { full_name: string; employee_id: string | null } | null;
};
type AllowanceRow = {
  id: string;
  employee_id: string;
  allowance_type: string;
  amount: number;
  employees: { full_name: string; employee_id: string | null } | null;
};

export default function SalaryDeductionsManager() {
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [allowances, setAllowances] = useState<AllowanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addEmployeeId, setAddEmployeeId] = useState<string>("");
  const [addDeductionType, setAddDeductionType] = useState<string>("pf");
  const [addDeductionAmount, setAddDeductionAmount] = useState("");
  const [addAllowanceType, setAddAllowanceType] = useState<string>("hra");
  const [addAllowanceAmount, setAddAllowanceAmount] = useState("");

  const fetchEmployees = () => {
    createClient()
      .from("employees")
      .select("id, full_name, employee_id")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setEmployees(data ?? []));
  };

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/salary-deductions?monthYear=${monthYear}`).then((r) => r.json()),
    ])
      .then(([res]) => {
        setDeductions(res.deductions ?? []);
        setAllowances(res.allowances ?? []);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchData();
  }, [monthYear]);

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmployeeId || !addDeductionAmount) {
      setError("Select employee and enter amount.");
      return;
    }
    const amt = parseFloat(addDeductionAmount);
    if (isNaN(amt) || amt < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    const result = await upsertSalaryDeduction(
      addEmployeeId,
      monthYear,
      addDeductionType,
      amt
    );
    if (result.ok) {
      setAddDeductionAmount("");
      fetchData();
    } else {
      setError(result.error);
    }
  };

  const handleAddAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmployeeId || !addAllowanceAmount) {
      setError("Select employee and enter amount.");
      return;
    }
    const amt = parseFloat(addAllowanceAmount);
    if (isNaN(amt) || amt < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    const result = await upsertSalaryAllowance(
      addEmployeeId,
      monthYear,
      addAllowanceType,
      amt
    );
    if (result.ok) {
      setAddAllowanceAmount("");
      fetchData();
    } else {
      setError(result.error);
    }
  };

  const handleDeleteDeduction = async (row: DeductionRow) => {
    const result = await deleteSalaryDeduction(
      row.employee_id,
      monthYear,
      row.deduction_type
    );
    if (result.ok) fetchData();
    else setError(result.error);
  };

  const handleDeleteAllowance = async (row: AllowanceRow) => {
    const result = await deleteSalaryAllowance(
      row.employee_id,
      monthYear,
      row.allowance_type
    );
    if (result.ok) fetchData();
    else setError(result.error);
  };

  const empName = (e: { full_name?: string; employee_id?: string | null } | null) =>
    e?.full_name ?? "—";

  const deductionLabel = (t: string) =>
    DEDUCTION_TYPES.find((d) => d.value === t)?.label ?? t;
  const allowanceLabel = (t: string) =>
    ALLOWANCE_TYPES.find((a) => a.value === t)?.label ?? t;

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">Deductions & Allowances</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add PF, TDS, advances, HRA, transport, etc. for the selected month. These
          apply to payslips and NEFT.
        </p>

        <div className="space-y-2 mb-4">
          <Label>Month</Label>
          <Input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <form onSubmit={handleAddDeduction} className="space-y-3">
            <h4 className="font-medium">Add Deduction</h4>
            <div className="flex flex-wrap gap-2">
              <Select
                value={addEmployeeId}
                onValueChange={setAddEmployeeId}
                required
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={addDeductionType}
                onValueChange={setAddDeductionType}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEDUCTION_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={addDeductionAmount}
                onChange={(e) => setAddDeductionAmount(e.target.value)}
                className="w-[100px]"
              />
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </form>

          <form onSubmit={handleAddAllowance} className="space-y-3">
            <h4 className="font-medium">Add Allowance</h4>
            <div className="flex flex-wrap gap-2">
              <Select
                value={addEmployeeId}
                onValueChange={setAddEmployeeId}
                required
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={addAllowanceType}
                onValueChange={setAddAllowanceType}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWANCE_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={addAllowanceAmount}
                onChange={(e) => setAddAllowanceAmount(e.target.value)}
                className="w-[100px]"
              />
              <Button type="submit" size="sm" variant="secondary">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </form>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {deductions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Deductions ({monthYear})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((r) => (
                      <TableRow key={`${r.employee_id}-${r.deduction_type}`}>
                        <TableCell>{empName(r.employees)}</TableCell>
                        <TableCell>{deductionLabel(r.deduction_type)}</TableCell>
                        <TableCell>₹{Number(r.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDeduction(r)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {allowances.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Allowances ({monthYear})</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allowances.map((r) => (
                      <TableRow key={`${r.employee_id}-${r.allowance_type}`}>
                        <TableCell>{empName(r.employees)}</TableCell>
                        <TableCell>{allowanceLabel(r.allowance_type)}</TableCell>
                        <TableCell>₹{Number(r.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAllowance(r)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {deductions.length === 0 && allowances.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No deductions or allowances for this month.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
