"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAcademicYears, type AcademicYearOption } from "@/lib/lov";

export default function HolidayForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    academic_year_id: "",
    date: "",
    name: "",
    type: "public",
  });
  const [years, setYears] = useState<AcademicYearOption[]>([]);

  useEffect(() => {
    (async () => {
      const all = await fetchAcademicYears();
      const active = all.filter((y) => y.status === "active");
      setYears(all);
      if (active.length === 1) {
        setForm((p) => ({ ...p, academic_year_id: active[0].id }));
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.academic_year_id || !form.date || !form.name.trim()) {
      setError("Academic year, date and name are required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("holidays").insert({
        academic_year_id: form.academic_year_id,
        date: form.date,
        name: form.name.trim(),
        type: form.type,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setForm({ academic_year_id: form.academic_year_id, date: "", name: "", type: "public" });
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Academic Year *</Label>
              <Select
                value={form.academic_year_id}
                onValueChange={(v) => setForm((p) => ({ ...p, academic_year_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AY" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                      {y.status === "active" ? " (Active)" : y.status === "future" ? " (Future)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker value={form.date} onChange={(isoDate) => setForm((p) => ({ ...p, date: isoDate }))} />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Republic Day" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="optional">Optional</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-start">
          <SubmitButton loading={loading} loadingLabel="Adding…">Add Holiday</SubmitButton>
        </div>
        </form>
      </CardContent>
    </Card>
  );
}
