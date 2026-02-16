"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUSES = ["present", "absent", "half_day", "leave", "holiday", "week_off"] as const;

type EmployeeOption = { id: string; full_name: string };

export default function AttendanceManualForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().split("T")[0],
    status: "present",
    in_time: "",
    out_time: "",
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.employee_id || !form.attendance_date) {
      setError("Employee and date are required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("attendance_manual").upsert({
        employee_id: form.employee_id,
        attendance_date: form.attendance_date,
        status: form.status,
        in_time: form.in_time || null,
        out_time: form.out_time || null,
        remarks: form.remarks.trim() || null,
      }, { onConflict: "employee_id,attendance_date" });
      if (err) {
        setError(err.message);
        return;
      }
      setForm({ ...form, employee_id: "", remarks: "" });
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
        <CardTitle>Attendance Override</CardTitle>
        <p className="text-sm text-muted-foreground">Override or correct status when biometric data is missing or incorrect.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.attendance_date} onChange={(e) => setForm((p) => ({ ...p, attendance_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>In Time</Label>
              <Input type="time" value={form.in_time} onChange={(e) => setForm((p) => ({ ...p, in_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Out Time</Label>
              <Input type="time" value={form.out_time} onChange={(e) => setForm((p) => ({ ...p, out_time: e.target.value }))} />
            </div>
          </div>
          <SubmitButton loading={loading} loadingLabel="Saving…" className="w-full">Save Attendance</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
