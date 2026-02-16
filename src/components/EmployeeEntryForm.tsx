"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLES = ["teacher", "staff", "admin", "other"] as const;
const EMPLOYEE_TYPES = ["full_time", "part_time", "contract", "temporary"] as const;

type ShiftOption = { id: string; name: string };

export default function EmployeeEntryForm({ shifts }: { shifts: ShiftOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    address: "",
    aadhaar: "",
    pan: "",
    role: "staff",
    department: "",
    designation: "",
    employee_type: "full_time",
    joining_date: "",
    shift_id: "",
    degree: "",
    institution: "",
    year_passed: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_holder_name: "",
    monthly_salary: "",
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
      const empId = `EMP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .insert({
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
          employee_id: empId,
          monthly_salary: form.monthly_salary ? parseFloat(form.monthly_salary) : null,
        })
        .select("id")
        .single();

      if (empErr || !emp) {
        setError(empErr?.message ?? "Failed to add employee");
        return;
      }

      if (form.degree?.trim()) {
        await supabase.from("employee_qualifications").insert({
          employee_id: emp.id,
          degree: form.degree.trim(),
          institution: form.institution?.trim() || null,
          year_passed: form.year_passed ? parseInt(form.year_passed) : null,
        });
      }

      if (form.bank_name?.trim() && form.account_number?.trim()) {
        await supabase.from("employee_bank_accounts").insert({
          employee_id: emp.id,
          bank_name: form.bank_name.trim(),
          account_number: form.account_number.trim(),
          ifsc_code: form.ifsc_code?.trim() || null,
          account_holder_name: form.account_holder_name?.trim() || form.full_name.trim(),
        });
      }

      setForm({
        full_name: "", email: "", phone_number: "", address: "", aadhaar: "", pan: "",
        role: "staff", department: "", designation: "", employee_type: "full_time",
        joining_date: "", shift_id: "", degree: "", institution: "", year_passed: "",
        bank_name: "", account_number: "", ifsc_code: "", account_holder_name: "",
        monthly_salary: "",
      });
      setExpanded(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}

          <div className="space-y-2">
            <Label>Full name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Full name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} placeholder="Phone" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aadhaar</Label>
              <Input value={form.aadhaar} onChange={(e) => setForm((p) => ({ ...p, aadhaar: e.target.value }))} placeholder="Aadhaar number" maxLength={12} />
            </div>
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input value={form.pan} onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value }))} placeholder="PAN" maxLength={10} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="e.g. Mathematics" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} placeholder="e.g. Senior Teacher" />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Salary (₹)</Label>
              <Input type="number" min={0} step={0.01} value={form.monthly_salary} onChange={(e) => setForm((p) => ({ ...p, monthly_salary: e.target.value }))} placeholder="For NEFT/payroll" />
            </div>
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm((p) => ({ ...p, joining_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={form.shift_id} onValueChange={(v) => setForm((p) => ({ ...p, shift_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button type="button" onClick={() => setExpanded(!expanded)} className="text-sm text-primary font-medium">
            {expanded ? "- Hide" : "+ Show"} Qualification & Bank Details
          </button>

          {expanded && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-semibold">Qualification</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input value={form.degree} onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))} placeholder="e.g. B.Ed" />
                </div>
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input value={form.institution} onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))} placeholder="College/University" />
                </div>
                <div className="space-y-2">
                  <Label>Year Passed</Label>
                  <Input type="number" value={form.year_passed} onChange={(e) => setForm((p) => ({ ...p, year_passed: e.target.value }))} placeholder="2020" />
                </div>
              </div>
              <h4 className="text-sm font-semibold">Bank Account (Salary)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="Bank name" />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={form.account_number} onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))} placeholder="Account number" />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input value={form.ifsc_code} onChange={(e) => setForm((p) => ({ ...p, ifsc_code: e.target.value }))} placeholder="IFSC" />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input value={form.account_holder_name} onChange={(e) => setForm((p) => ({ ...p, account_holder_name: e.target.value }))} placeholder="As per bank" />
                </div>
              </div>
            </div>
          )}

          <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">Add Employee</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
