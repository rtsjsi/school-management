"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmployeeOption = { id: string; full_name: string };

export default function AttendancePunchForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [form, setForm] = useState({
    employee_id: "",
    punch_date: now.toISOString().split("T")[0],
    punch_time: now.toTimeString().slice(0, 5),
    punch_type: "IN" as "IN" | "OUT",
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.employee_id) {
      setError("Select employee.");
      return;
    }
    setLoading(true);
    try {
      const punchDateTime = new Date(`${form.punch_date}T${form.punch_time}:00`);
      const supabase = createClient();
      const { error: err } = await supabase.from("attendance_punches").insert({
        employee_id: form.employee_id,
        punch_date: form.punch_date,
        punch_time: punchDateTime.toISOString(),
        punch_type: form.punch_type,
        source: "manual",
      });
      if (err) {
        setError(err.message);
        return;
      }
      setForm({ ...form, employee_id: "" });
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
        <CardTitle>Punch IN/OUT</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={form.employee_id} onValueChange={(v) => setForm((p) => ({ ...p, employee_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.punch_date} onChange={(e) => setForm((p) => ({ ...p, punch_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={form.punch_time} onChange={(e) => setForm((p) => ({ ...p, punch_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.punch_type} onValueChange={(v) => setForm((p) => ({ ...p, punch_type: v as "IN" | "OUT" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">IN</SelectItem>
                  <SelectItem value="OUT">OUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SubmitButton loading={loading} loadingLabel="Recording…" className="w-full">Record Punch</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
