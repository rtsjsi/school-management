"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

const ROLES = ["teacher", "staff", "admin", "other"] as const;
const EMPLOYEE_TYPES = ["full_time", "part_time", "contract", "temporary"] as const;

interface EmployeeEditDialogProps {
  employee: {
    id: string;
    employee_id?: string;
    full_name: string;
    email?: string;
    phone_number?: string;
    address?: string;
    aadhaar?: string;
    pan?: string;
    role?: string;
    department?: string;
    designation?: string;
    employee_type?: string;
    joining_date?: string;
    shift_id?: string;
    status?: string;
    monthly_salary?: number | null;
  };
  shifts: { id: string; name: string }[];
}

export function EmployeeEditDialog({ employee, shifts }: EmployeeEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: employee.full_name || "",
    email: employee.email || "",
    phone_number: employee.phone_number || "",
    address: employee.address || "",
    aadhaar: employee.aadhaar || "",
    pan: employee.pan || "",
    role: employee.role || "staff",
    department: employee.department || "",
    designation: employee.designation || "",
    employee_type: employee.employee_type || "full_time",
    joining_date: employee.joining_date || "",
    shift_id: employee.shift_id || "",
    status: employee.status || "active",
    monthly_salary: employee.monthly_salary?.toString() || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
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
          department: form.department.trim() || null,
          designation: form.designation.trim() || null,
          employee_type: form.employee_type,
          joining_date: form.joining_date || null,
          shift_id: form.shift_id || null,
          status: form.status,
          monthly_salary: form.monthly_salary ? parseFloat(form.monthly_salary) : null,
        })
        .eq("id", employee.id);
      if (err) {
        setError(err.message);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update {employee.full_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aadhaar</Label>
              <Input value={form.aadhaar} onChange={(e) => setForm((p) => ({ ...p, aadhaar: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input value={form.pan} onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Employee Type</Label>
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
              <Label>Monthly Salary (₹)</Label>
              <Input type="number" min={0} step={0.01} value={form.monthly_salary} onChange={(e) => setForm((p) => ({ ...p, monthly_salary: e.target.value }))} placeholder="For NEFT" />
            </div>
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm((p) => ({ ...p, joining_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={form.shift_id} onValueChange={(v) => setForm((p) => ({ ...p, shift_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton loading={loading} loadingLabel="Saving…">Save</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
