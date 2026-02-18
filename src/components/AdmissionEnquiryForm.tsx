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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const STATUSES = ["new", "contacted", "visit_scheduled", "admitted", "closed"] as const;

export function AdmissionEnquiryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_phone: "",
    contact_email: "",
    class_of_interest: "",
    enquiry_date: new Date().toISOString().slice(0, 10),
    status: "new" as string,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("admission_enquiries").insert({
        name: form.name.trim(),
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        class_of_interest: form.class_of_interest.trim() || null,
        enquiry_date: form.enquiry_date || null,
        status: form.status,
        notes: form.notes.trim() || null,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setForm({
        name: "",
        contact_phone: "",
        contact_email: "",
        class_of_interest: "",
        enquiry_date: new Date().toISOString().slice(0, 10),
        status: "new",
        notes: "",
      });
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
        <CardTitle>New Enquiry</CardTitle>
        <CardDescription>Add a prospective student enquiry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Student or guardian name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_of_interest">Class of interest</Label>
              <Input
                id="class_of_interest"
                value={form.class_of_interest}
                onChange={(e) => setForm((p) => ({ ...p, class_of_interest: e.target.value }))}
                placeholder="e.g. 5, 10"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                placeholder="Contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                placeholder="Email"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enquiry_date">Enquiry date</Label>
              <Input
                id="enquiry_date"
                type="date"
                value={form.enquiry_date}
                onChange={(e) => setForm((p) => ({ ...p, enquiry_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <SubmitButton loading={loading} loadingLabel="Adding…">
            Add Enquiry
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
