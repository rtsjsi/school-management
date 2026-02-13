"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShiftForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    start_time: "09:00",
    end_time: "17:00",
    grace_period_minutes: "15",
    late_threshold_minutes: "15",
    early_departure_threshold_minutes: "15",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Shift name is required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("shifts").insert({
        name: form.name.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
        grace_period_minutes: parseInt(form.grace_period_minutes) || 0,
        late_threshold_minutes: parseInt(form.late_threshold_minutes) || 15,
        early_departure_threshold_minutes: parseInt(form.early_departure_threshold_minutes) || 15,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setForm({ name: "", start_time: "09:00", end_time: "17:00", grace_period_minutes: "15", late_threshold_minutes: "15", early_departure_threshold_minutes: "15" });
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
        <CardTitle>Add Shift</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="space-y-2">
            <Label>Shift Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Morning Shift" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Grace Period (min)</Label>
              <Input type="number" min={0} value={form.grace_period_minutes} onChange={(e) => setForm((p) => ({ ...p, grace_period_minutes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Late Threshold (min)</Label>
              <Input type="number" min={0} value={form.late_threshold_minutes} onChange={(e) => setForm((p) => ({ ...p, late_threshold_minutes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Early Departure (min)</Label>
              <Input type="number" min={0} value={form.early_departure_threshold_minutes} onChange={(e) => setForm((p) => ({ ...p, early_departure_threshold_minutes: e.target.value }))} />
            </div>
          </div>
          <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">Add Shift</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
