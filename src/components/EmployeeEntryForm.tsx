"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EMPLOYEE_TYPES, EMPLOYEE_ROLES } from "@/lib/lov";
import { reassignEmployeeIds } from "@/lib/employee-id";
import { normalizeTimeForDb } from "@/lib/employee-shift";

const INITIAL_FORM_STATE = {
  full_name: "",
  email: "",
  phone_number: "",
  address: "",
  aadhaar: "",
  pan: "",
  role: "staff",
  employee_type: "full_time",
  joining_date: "",
  shift_start_time: "09:00",
  shift_end_time: "17:00",
  biometric_enroll_no: "",
  degree: "",
  institution: "",
  year_passed: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  account_holder_name: "",
  basic_salary: "",
  allowance: "",
  child_allowance: "",
  pf_deduction: "",
  monthly_salary: "",
};

export default function EmployeeEntryForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM_STATE);
      setError(null);
    }
  }, [open]);

  const requiredFields: { key: keyof typeof form; label: string }[] = [
    { key: "full_name", label: "Full name" },
    { key: "email", label: "Email" },
    { key: "phone_number", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "aadhaar", label: "Aadhaar" },
    { key: "pan", label: "PAN" },
    { key: "role", label: "Role" },
    { key: "employee_type", label: "Employee type" },
    { key: "joining_date", label: "Joining date" },
    { key: "degree", label: "Degree" },
    { key: "institution", label: "Institution" },
    { key: "year_passed", label: "Year passed" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (const { key, label } of requiredFields) {
      const value = form[key];
      const str = typeof value === "string" ? value.trim() : "";
      if (!str) {
        const message = `${label} is required.`;
        setError(message);
        toast({
          variant: "destructive",
          title: "Please check the form",
          description: message,
        });
        return;
      }
    }

    setLoading(true);
    try {
      const supabase = createClient();

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
          employee_type: form.employee_type,
          joining_date: form.joining_date || null,
          shift_start_time: normalizeTimeForDb(form.shift_start_time),
          shift_end_time: normalizeTimeForDb(form.shift_end_time),
          biometric_enroll_no: form.biometric_enroll_no.trim() || null,
          employee_id: "0",
          monthly_salary: form.monthly_salary ? parseFloat(form.monthly_salary) : null,
          degree: form.degree.trim() || null,
          institution: form.institution?.trim() || null,
          year_passed: form.year_passed ? parseInt(form.year_passed) : null,
          bank_name: form.bank_name.trim() || null,
          account_number: form.account_number.trim() || null,
          ifsc_code: form.ifsc_code?.trim() || null,
          account_holder_name: form.account_holder_name?.trim() || form.full_name.trim(),
        })
        .select("id")
        .single();

      if (empErr || !emp) {
        const message = empErr?.message ?? "Failed to add employee";
        setError(message);
        toast({
          variant: "destructive",
          title: "Could not add employee",
          description: message,
        });
        return;
      }

      // Insert initial salary history
      const basic = form.basic_salary ? parseFloat(form.basic_salary) : 0;
      const allowance = form.allowance ? parseFloat(form.allowance) : 0;
      const child_allowance = form.child_allowance ? parseFloat(form.child_allowance) : 0;
      const pf_deduction = form.pf_deduction ? parseFloat(form.pf_deduction) : 0;
      
      await supabase.from("employee_salary_history").insert({
        employee_id: emp.id,
        effective_from_date: form.joining_date || new Date().toISOString().split('T')[0],
        basic_salary: basic,
        allowance: allowance,
        child_allowance: child_allowance,
        pf_deduction: pf_deduction
      });

      // Insert default casual leave balance for current year
      const y = new Date().getFullYear();
      const m = new Date().getMonth() + 1;
      const academicYear = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
      await supabase.from("employee_leave_balances").insert({
        employee_id: emp.id,
        academic_year: academicYear,
        leave_type: "casual_leave",
        allocated_days: 5,
        used_days: 0
      });

      const { error: reassignError } = await reassignEmployeeIds(supabase);
      if (reassignError) {
        toast({
          variant: "destructive",
          title: "Employee added but ID assignment failed",
          description: reassignError,
        });
      }

      setOpen(false);
      toast({
        title: "Employee added",
        description: `${form.full_name.trim()} has been added successfully.`,
      });
      router.refresh();
    } catch {
      const message = "Something went wrong.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <UserPlus className="h-4 w-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base">Add new employee</DialogTitle>
          <DialogDescription>
            Fill in the form to create a new employee record.
          </DialogDescription>
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
                <Label>Full name *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={form.phone_number}
                    onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                    placeholder="Phone"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Address"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aadhaar *</Label>
                  <Input
                    value={form.aadhaar}
                    onChange={(e) => setForm((p) => ({ ...p, aadhaar: e.target.value }))}
                    placeholder="Aadhaar number"
                    maxLength={12}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAN *</Label>
                  <Input
                    value={form.pan}
                    onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value }))}
                    placeholder="PAN"
                    maxLength={10}
                    required
                  />
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
                      const basic = parseFloat(val || "0");
                      const all = parseFloat(form.allowance || "0");
                      const child = parseFloat(form.child_allowance || "0");
                      const pf = parseFloat(form.pf_deduction || "0");
                      setForm((p) => ({ ...p, basic_salary: val, monthly_salary: String(basic + all + child - pf) }));
                    }}
                    placeholder="Basic"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Allowance (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.allowance}
                    onChange={(e) => {
                      const val = e.target.value;
                      const basic = parseFloat(form.basic_salary || "0");
                      const all = parseFloat(val || "0");
                      const child = parseFloat(form.child_allowance || "0");
                      const pf = parseFloat(form.pf_deduction || "0");
                      setForm((p) => ({ ...p, allowance: val, monthly_salary: String(basic + all + child - pf) }));
                    }}
                    placeholder="Allowance"
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
                      const basic = parseFloat(form.basic_salary || "0");
                      const all = parseFloat(form.allowance || "0");
                      const child = parseFloat(val || "0");
                      const pf = parseFloat(form.pf_deduction || "0");
                      setForm((p) => ({ ...p, child_allowance: val, monthly_salary: String(basic + all + child - pf) }));
                    }}
                    placeholder="Child Allowance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PF Deduction (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.pf_deduction}
                    onChange={(e) => {
                      const val = e.target.value;
                      const basic = parseFloat(form.basic_salary || "0");
                      const all = parseFloat(form.allowance || "0");
                      const child = parseFloat(form.child_allowance || "0");
                      const pf = parseFloat(val || "0");
                      setForm((p) => ({ ...p, pf_deduction: val, monthly_salary: String(basic + all + child - pf) }));
                    }}
                    placeholder="PF"
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton loading={loading} loadingLabel="Adding…">Add Employee</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
