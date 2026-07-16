"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EMPLOYEE_TYPES, EMPLOYEE_ROLES } from "@/lib/lov";
import { reassignEmployeeIds } from "@/lib/employee-id";
import { normalizeTimeForDb, timeForInput } from "@/lib/employee-shift";

function netSalary(basic: string, other: string, child: string): string {
  const total =
    parseFloat(basic || "0") + parseFloat(other || "0") + parseFloat(child || "0");
  return Number.isFinite(total) ? String(total) : "";
}

interface EmployeeEditDialogProps {
  employee: {
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
    shift_start_time?: string | null;
    shift_end_time?: string | null;
    biometric_enroll_no?: string | null;
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
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}

export function EmployeeEditDialog({
  employee,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSaved,
}: EmployeeEditDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildForm = () => {
    const basic = employee.basic_salary != null ? String(employee.basic_salary) : "";
    const other = employee.other_allowance != null ? String(employee.other_allowance) : "";
    const child = employee.child_allowance != null ? String(employee.child_allowance) : "";
    return {
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone_number: employee.phone_number || "",
      address: employee.address || "",
      aadhaar: employee.aadhaar || "",
      pan: employee.pan || "",
      role: employee.role || "staff",
      employee_type: employee.employee_type || "full_time",
      joining_date: employee.joining_date || "",
      shift_start_time: timeForInput(employee.shift_start_time) || "09:00",
      shift_end_time: timeForInput(employee.shift_end_time) || "17:00",
      biometric_enroll_no: employee.biometric_enroll_no || "",
      status: employee.status || "active",
      basic_salary: basic,
      other_allowance: other,
      child_allowance: child,
      casual_leave_balance:
        employee.casual_leave_balance != null ? String(employee.casual_leave_balance) : "5",
      monthly_salary: netSalary(basic, other, child) || (employee.monthly_salary?.toString() || ""),
      degree: employee.degree || "",
      institution: employee.institution || "",
      year_passed: employee.year_passed ? String(employee.year_passed) : "",
      bank_name: employee.bank_name || "",
      account_number: employee.account_number || "",
      ifsc_code: employee.ifsc_code || "",
      account_holder_name: employee.account_holder_name || "",
    };
  };

  const [form, setForm] = useState(buildForm);

  useEffect(() => {
    if (open) {
      setForm(buildForm());
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset from current employee when dialog opens
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      toast({
        variant: "destructive",
        title: "Please check the form",
        description: "Full name is required.",
      });
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const basic = form.basic_salary ? parseFloat(form.basic_salary) : 0;
      const other = form.other_allowance ? parseFloat(form.other_allowance) : 0;
      const child = form.child_allowance ? parseFloat(form.child_allowance) : 0;
      const monthly = basic + other + child;

      const { error: err } = await supabase
        .from("employees")
        .update({
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          phone_number: form.phone_number.trim() || null,
          address: form.address.trim() || null,
          aadhaar: form.aadhaar.trim() || null,
          pan: form.pan.trim() || null,
          role: form.role,
          employee_type: form.employee_type,
          joining_date: form.joining_date || null,
          shift_start_time: normalizeTimeForDb(form.shift_start_time),
          shift_end_time: normalizeTimeForDb(form.shift_end_time),
          biometric_enroll_no: form.biometric_enroll_no.trim() || null,
          status: form.status,
          basic_salary: basic,
          other_allowance: other,
          child_allowance: child,
          casual_leave_balance: form.casual_leave_balance
            ? parseFloat(form.casual_leave_balance)
            : 5,
          monthly_salary: monthly || null,
          degree: form.degree.trim() || null,
          institution: form.institution.trim() || null,
          year_passed: form.year_passed ? parseInt(form.year_passed) : null,
          bank_name: form.bank_name.trim() || null,
          account_number: form.account_number.trim() || null,
          ifsc_code: form.ifsc_code.trim() || null,
          account_holder_name: form.account_holder_name.trim() || form.full_name.trim(),
        })
        .eq("id", employee.id);
      if (err) {
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Could not update employee",
          description: err.message,
        });
        return;
      }

      const joiningChanged = (form.joining_date || null) !== (employee.joining_date || null);
      if (joiningChanged) {
        const { error: reassignError } = await reassignEmployeeIds(supabase);
        if (reassignError) {
          toast({
            variant: "destructive",
            title: "Employee updated but ID reassignment failed",
            description: reassignError,
          });
        }
      }

      toast({
        title: "Employee updated",
        description: `${form.full_name.trim()} has been updated successfully.`,
      });
      setOpen?.(false);
      if (onSaved) onSaved();
      router.refresh();
    } catch {
      setError("Something went wrong.");
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update {employee.full_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="details">Personal & Job Details</TabsTrigger>
              <TabsTrigger value="salary">Salary & Bank Details</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={employee.employee_id ?? "—"} readOnly disabled className="bg-muted font-mono" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aadhaar *</Label>
                  <Input value={form.aadhaar} onChange={(e) => setForm((p) => ({ ...p, aadhaar: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>PAN *</Label>
                  <Input value={form.pan} onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employee Type *</Label>
                  <Select value={form.employee_type} onValueChange={(v) => setForm((p) => ({ ...p, employee_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Joining Date *</Label>
                  <DatePicker value={form.joining_date} onChange={(isoDate) => setForm((p) => ({ ...p, joining_date: isoDate }))} />
                </div>
                <div className="space-y-2">
                  <Label>Shift Start Time</Label>
                  <Input
                    type="time"
                    value={form.shift_start_time}
                    onChange={(e) => setForm((p) => ({ ...p, shift_start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shift End Time</Label>
                  <Input
                    type="time"
                    value={form.shift_end_time}
                    onChange={(e) => setForm((p) => ({ ...p, shift_end_time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Biometric Enrollment No</Label>
                  <Input
                    value={form.biometric_enroll_no}
                    onChange={(e) => setForm((p) => ({ ...p, biometric_enroll_no: e.target.value }))}
                    placeholder="EnNo on the device (e.g. 5)"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold">Qualification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Degree *</Label>
                    <Input
                      value={form.degree}
                      onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))}
                      placeholder="e.g. B.Ed"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Institution *</Label>
                    <Input
                      value={form.institution}
                      onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))}
                      placeholder="College/University"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year Passed *</Label>
                    <Input
                      type="number"
                      value={form.year_passed}
                      onChange={(e) => setForm((p) => ({ ...p, year_passed: e.target.value }))}
                      placeholder="2020"
                      required
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.basic_salary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({
                        ...p,
                        basic_salary: val,
                        monthly_salary: netSalary(val, p.other_allowance, p.child_allowance),
                      }));
                    }}
                    placeholder="Basic"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Allowance (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.other_allowance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({
                        ...p,
                        other_allowance: val,
                        monthly_salary: netSalary(p.basic_salary, val, p.child_allowance),
                      }));
                    }}
                    placeholder="Other Allowance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Child Allowance (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.child_allowance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({
                        ...p,
                        child_allowance: val,
                        monthly_salary: netSalary(p.basic_salary, p.other_allowance, val),
                      }));
                    }}
                    placeholder="Child Allowance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Casual Leave Balance</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.casual_leave_balance}
                    onChange={(e) => setForm((p) => ({ ...p, casual_leave_balance: e.target.value }))}
                    placeholder="Days"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Net Salary (Auto)</Label>
                  <Input
                    type="text"
                    value={form.monthly_salary}
                    disabled
                    className="bg-muted"
                    placeholder="Calculated"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-semibold">Bank Account (Salary)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                      placeholder="Bank name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={form.account_number}
                      onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
                      placeholder="Account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={form.ifsc_code}
                      onChange={(e) => setForm((p) => ({ ...p, ifsc_code: e.target.value }))}
                      placeholder="IFSC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input
                      value={form.account_holder_name}
                      onChange={(e) => setForm((p) => ({ ...p, account_holder_name: e.target.value }))}
                      placeholder="As per bank"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>Cancel</Button>
            <SubmitButton loading={loading} loadingLabel="Saving…">Save</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
