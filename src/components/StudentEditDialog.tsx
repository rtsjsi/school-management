"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { CATEGORIES, IN_STATES, studentFormFromRecord, formToPayload, type StudentFormState } from "@/lib/student-form";
import { StudentDocumentsPhotos } from "@/components/StudentDocumentsPhotos";
import { StandardDivisionYearSelects } from "@/components/StandardDivisionYearSelects";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

interface StudentEditDialogProps {
  student: Record<string, unknown> & {
    id: string;
    full_name: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    standard?: string;
    division?: string;
    roll_number?: number;
    admission_date?: string;
    status?: string;
    is_rte_quota?: boolean;

    present_address_line1?: string;
    present_city?: string;
    present_district?: string;
    present_state?: string;
    present_pincode?: string;
    present_country?: string;
  };
  onSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type StudentEditFormProps = {
  student: Record<string, unknown> & { id: string; full_name: string };
  onSaved?: () => void;
  onCancel?: () => void;
};

function StudentEditFormInline({ student, onSaved, onCancel }: StudentEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(() => studentFormFromRecord(student));

  const set = (key: keyof StudentFormState, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = formToPayload(form);



      // Check unique fields: gr_number, udise_id, pen_no, apaar_id (excluding current student)
      const uniqueFieldsToCheck: { field: string; label: string; value: string }[] = [];
      if (payload.gr_number) uniqueFieldsToCheck.push({ field: "gr_number", label: "GR Number", value: payload.gr_number as string });
      if (payload.udise_id) uniqueFieldsToCheck.push({ field: "udise_id", label: "UDISE ID", value: payload.udise_id as string });
      if (payload.pen_no) uniqueFieldsToCheck.push({ field: "pen_no", label: "PEN Number", value: payload.pen_no as string });
      if (payload.apaar_id) uniqueFieldsToCheck.push({ field: "apaar_id", label: "APAAR ID", value: payload.apaar_id as string });

      if (uniqueFieldsToCheck.length > 0) {
        const orFilter = uniqueFieldsToCheck.map(item => `${item.field}.eq."${item.value.replace(/"/g, '\\"')}"`).join(",");
        const { data: dupStudents, error: dupError } = await supabase
          .from("students")
          .select("id, full_name, gr_number, udise_id, pen_no, apaar_id")
          .neq("id", student.id)
          .or(orFilter);

        if (dupError) {
          console.error("Duplicate unique fields check error:", dupError);
        } else if (dupStudents && dupStudents.length > 0) {
          for (const s of dupStudents) {
            for (const item of uniqueFieldsToCheck) {
              if (s[item.field as keyof typeof s] === item.value) {
                setError(`${item.label} "${item.value}" is already assigned to student "${s.full_name}".`);
                return;
              }
            }
          }
        }
      }

      // Check roll number in the same standard and division (excluding current student)
      const rollNumber = payload.roll_number as number | null;
      const standard = payload.standard as string | null;
      const division = payload.division as string | null;
      if (standard && division && rollNumber !== null) {
        const { data: rollDup, error: rollDupError } = await supabase
          .from("students")
          .select("id, full_name")
          .eq("standard", standard)
          .eq("division", division)
          .eq("roll_number", rollNumber)
          .neq("id", student.id)
          .limit(1)
          .maybeSingle();

        if (rollDupError) {
          console.error("Roll number duplicate check error:", rollDupError);
        } else if (rollDup) {
          setError(`Roll number ${rollNumber} is already assigned to student "${rollDup.full_name}" in class "${standard} - ${division}".`);
          return;
        }
      }

      const { error: err } = await supabase.from("students").update(payload).eq("id", student.id);
      if (err) {
        setError(err.message);
        return;
      }
      if (onSaved) onSaved();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal & Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full name *</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Student full name" />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of birth *</Label>
                <DatePicker value={form.date_of_birth} onChange={(isoDate) => set("date_of_birth", isoDate)} />
              </div>
              <div className="space-y-2">
                <Label>Blood group *</Label>
                <Select value={form.blood_group} onValueChange={(v) => set("blood_group", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category || "none"} onValueChange={(v) => set("category", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Religion</Label>
                <Input value={form.religion} onChange={(e) => set("religion", e.target.value)} placeholder="e.g. Hindu" />
              </div>
              <div className="space-y-2">
                <Label>Caste</Label>
                <Input value={form.caste} onChange={(e) => set("caste", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Birth place</Label>
                <Input value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother tongue</Label>
                <Input value={form.mother_tongue} onChange={(e) => set("mother_tongue", e.target.value)} placeholder="e.g. Gujarati" />
              </div>
              <div className="space-y-2">
                <Label>Second Language</Label>
                <Select value={form.second_language} onValueChange={(v) => set("second_language", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aadhar No *</Label>
                <Input value={form.aadhar_no} onChange={(e) => set("aadhar_no", e.target.value)} placeholder="12-digit" />
              </div>
              <div className="space-y-2">
                <Label>PEN No *</Label>
                <Input value={form.pen_no} onChange={(e) => set("pen_no", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>APAR ID *</Label>
                <Input value={form.apaar_id} onChange={(e) => set("apaar_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UDISE ID *</Label>
                <Input value={form.udise_id} onChange={(e) => set("udise_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>GR Number *</Label>
                <Input value={form.gr_number} onChange={(e) => set("gr_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Roll number *</Label>
                <Input type="number" value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} min={0} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Present Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Present address line 1 *</Label>
                <Textarea value={form.present_address_line1} onChange={(e) => set("present_address_line1", e.target.value)} placeholder="House/Flat, Society/Street, Area" rows={2} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Present address line 2</Label>
                <Textarea value={form.present_address_line2} onChange={(e) => set("present_address_line2", e.target.value)} placeholder="Landmark / Additional details" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Present city *</Label>
                <Input value={form.present_city} onChange={(e) => set("present_city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Present taluka/tehsil</Label>
                <Input value={form.present_taluka} onChange={(e) => set("present_taluka", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Present district *</Label>
                <Input value={form.present_district} onChange={(e) => set("present_district", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Present state *</Label>
                <Select value={form.present_state || "none"} onValueChange={(v) => set("present_state", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {IN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Present pincode *</Label>
                <Input inputMode="numeric" value={form.present_pincode} onChange={(e) => set("present_pincode", e.target.value.replace(/[^\d]/g, "").slice(0, 6))} placeholder="6-digit" />
              </div>
              <div className="space-y-2">
                <Label>Present country</Label>
                <Input value={form.present_country} onChange={(e) => set("present_country", e.target.value)} placeholder="India" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Father name *</Label>
                <Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother name *</Label>
                <Input value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother contact</Label>
                <Input type="tel" value={form.mother_contact} onChange={(e) => set("mother_contact", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp no *</Label>
                <Input type="tel" value={form.whatsapp_no} onChange={(e) => set("whatsapp_no", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admission & Academic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Admission date *</Label>
                <DatePicker value={form.admission_date} onChange={(isoDate) => set("admission_date", isoDate)} />
              </div>
              <StandardDivisionYearSelects
                standard={form.standard}
                division={form.division}
                academicYear=""
                onStandardChange={(v) => {
                  set("standard", v);
                  set("division", "");
                }}
                onDivisionChange={(v) => set("division", v)}
                showAcademicYear={false}
              />
              <div className="flex items-center space-x-2 sm:col-span-2">
                <Checkbox id="rte" checked={form.is_rte_quota} onCheckedChange={(c) => set("is_rte_quota", !!c)} />
                <Label htmlFor="rte" className="font-normal">RTE (Right to Education) Quota</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous School</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Previous school Name</Label>
                <Input value={form.last_school} onChange={(e) => set("last_school", e.target.value)} placeholder="Name of last school" />
              </div>
              <div className="space-y-2">
                <Label>Previous school State Unique ID</Label>
                <Input value={form.previous_school_state_unique_id} onChange={(e) => set("previous_school_state_unique_id", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fee Concession & Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fee concession amount (Rs)</Label>
                <Input type="number" value={form.fee_concession_amount} onChange={(e) => set("fee_concession_amount", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Fee concession reason</Label>
                <Input value={form.fee_concession_reason} onChange={(e) => set("fee_concession_reason", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Account holder name</Label>
                <Input value={form.account_holder_name} onChange={(e) => set("account_holder_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bank name</Label>
                <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bank branch</Label>
                <Input value={form.bank_branch} onChange={(e) => set("bank_branch", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bank IFSC</Label>
                <Input value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Account no</Label>
                <Input value={form.account_no} onChange={(e) => set("account_no", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Height</Label>
                <Input value={form.height} onChange={(e) => set("height", e.target.value)} placeholder="e.g. 160cm" />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g. 60Kg" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents & Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentDocumentsPhotos studentId={student.id} />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-start">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton loading={loading} loadingLabel="Saving…">
          Save Changes
        </SubmitButton>
      </div>
    </form>
  );
}

export function StudentEditDialog({ student, onSaved, open: controlledOpen, onOpenChange: controlledOnOpenChange }: StudentEditDialogProps) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen;

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
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base">Edit student</DialogTitle>
          <DialogDescription>
            Update student information for {student.full_name}
          </DialogDescription>
        </DialogHeader>
        <StudentEditFormInline
          student={student as Record<string, unknown> & { id: string; full_name: string }}
          onCancel={() => setOpen?.(false)}
          onSaved={() => {
            setOpen?.(false);
            if (onSaved) onSaved();
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
