"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  CATEGORIES,
  ADMISSION_TYPES,
  studentFormFromRecord,
  formToPayload,
  type StudentFormState,
} from "@/lib/student-form";
import { StudentDocumentsPhotos } from "@/components/StudentDocumentsPhotos";

interface StudentEditFormProps {
  student: Record<string, unknown> & { id: string; full_name: string };
}

export function StudentEditForm({ student }: StudentEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(() => studentFormFromRecord(student));

  const set = (key: keyof StudentFormState, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

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
      const payload = formToPayload(form);

      const { error: err } = await supabase
        .from("students")
        .update(payload)
        .eq("id", student.id);

      if (err) {
        setError(err.message);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/students" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Student name, contact, and identity details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full name *</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Student full name" required />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
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
                <Label>Date of birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Blood group</Label>
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
                <Label>Category</Label>
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" />
              </div>
              <div className="space-y-2">
                <Label>Society</Label>
                <Input value={form.society} onChange={(e) => set("society", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Birth place</Label>
                <Input value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Aadhar No</Label>
                <Input value={form.aadhar_no} onChange={(e) => set("aadhar_no", e.target.value)} placeholder="12-digit" />
              </div>
              <div className="space-y-2">
                <Label>Unique ID</Label>
                <Input value={form.unique_id} onChange={(e) => set("unique_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>PEN No</Label>
                <Input value={form.pen_no} onChange={(e) => set("pen_no", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>APAR ID</Label>
                <Input value={form.apaar_id} onChange={(e) => set("apaar_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UDISE ID</Label>
                <Input value={form.udise_id} onChange={(e) => set("udise_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>GR Number</Label>
                <Input value={form.gr_number} onChange={(e) => set("gr_number", e.target.value)} />
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parent & Guardian Details</CardTitle>
            <CardDescription>Father, mother, and guardian information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Father name</Label>
                <Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother name</Label>
                <Input value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Father contact</Label>
                <Input type="tel" value={form.parent_contact} onChange={(e) => set("parent_contact", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother contact</Label>
                <Input type="tel" value={form.mother_contact} onChange={(e) => set("mother_contact", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parent email</Label>
                <Input type="email" value={form.parent_email} onChange={(e) => set("parent_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp no</Label>
                <Input type="tel" value={form.whatsapp_no} onChange={(e) => set("whatsapp_no", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Father education</Label>
                <Input value={form.father_education} onChange={(e) => set("father_education", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Father occupation</Label>
                <Input value={form.father_occupation} onChange={(e) => set("father_occupation", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother education</Label>
                <Input value={form.mother_education} onChange={(e) => set("mother_education", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mother occupation</Label>
                <Input value={form.mother_occupation} onChange={(e) => set("mother_occupation", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Guardian name (if different)</Label>
                <Input value={form.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Guardian contact</Label>
                <Input type="tel" value={form.guardian_contact} onChange={(e) => set("guardian_contact", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Guardian email</Label>
                <Input type="email" value={form.guardian_email} onChange={(e) => set("guardian_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Guardian education</Label>
                <Input value={form.guardian_education} onChange={(e) => set("guardian_education", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Guardian occupation</Label>
                <Input value={form.guardian_occupation} onChange={(e) => set("guardian_occupation", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admission & Academic Details</CardTitle>
            <CardDescription>Grade, division, admission type, and previous school.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Admission type</Label>
                <Select value={form.admission_type} onValueChange={(v) => set("admission_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADMISSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admission date</Label>
                <Input type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Input value={form.grade} onChange={(e) => set("grade", e.target.value)} placeholder="e.g. 10" required />
              </div>
              <div className="space-y-2">
                <Label>Division *</Label>
                <Input value={form.section} onChange={(e) => set("section", e.target.value)} placeholder="e.g. A" required />
              </div>
              <div className="space-y-2">
                <Label>Roll number</Label>
                <Input type="number" value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Input value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} placeholder="2024-2025" />
              </div>
              <div className="space-y-2">
                <Label>Last school</Label>
                <Input value={form.last_school} onChange={(e) => set("last_school", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prev. school attendance</Label>
                <Input type="number" value={form.prev_school_attendance} onChange={(e) => set("prev_school_attendance", e.target.value)} min={0} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="rte" checked={form.is_rte_quota} onCheckedChange={(c) => set("is_rte_quota", !!c)} />
                <Label htmlFor="rte" className="font-normal">RTE (Right to Education) Quota</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other Details</CardTitle>
            <CardDescription>Physical, medical, and miscellaneous information.</CardDescription>
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
              <div className="space-y-2">
                <Label>Hobby</Label>
                <Input value={form.hobby} onChange={(e) => set("hobby", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sign of identity</Label>
                <Input value={form.sign_of_identity} onChange={(e) => set("sign_of_identity", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Refer name</Label>
                <Input value={form.refer_name} onChange={(e) => set("refer_name", e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox id="handicap" checked={form.handicap} onCheckedChange={(c) => set("handicap", !!c)} />
                  <Label htmlFor="handicap" className="font-normal">Handicap</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="minority" checked={form.minority} onCheckedChange={(c) => set("minority", !!c)} />
                  <Label htmlFor="minority" className="font-normal">Minority</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="permanent" checked={form.is_permanent} onCheckedChange={(c) => set("is_permanent", !!c)} />
                  <Label htmlFor="permanent" className="font-normal">Is permanent</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="hostel" checked={form.hostel_student} onCheckedChange={(c) => set("hostel_student", !!c)} />
                  <Label htmlFor="hostel" className="font-normal">Hostel student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="food" checked={form.food_provided} onCheckedChange={(c) => set("food_provided", !!c)} />
                  <Label htmlFor="food" className="font-normal">Food provided</Label>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fee Concession & Bank Details</CardTitle>
            <CardDescription>Fee mafi and bank account for refunds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fee mafi amount (Rs)</Label>
                <Input type="number" value={form.fee_mafi_amount} onChange={(e) => set("fee_mafi_amount", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Fee mafi reason</Label>
                <Input value={form.fee_mafi_reason} onChange={(e) => set("fee_mafi_reason", e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="all_mafi" checked={form.all_fee_mafi} onCheckedChange={(c) => set("all_fee_mafi", !!c)} />
                <Label htmlFor="all_mafi" className="font-normal">All fee mafi</Label>
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
            <CardTitle className="text-base">Documents & Photos</CardTitle>
            <CardDescription>Upload Aadhar card, photographs, and other documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentDocumentsPhotos studentId={student.id} />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/students">Cancel</Link>
        </Button>
        <SubmitButton loading={loading} loadingLabel="Saving…">
          Save Changes
        </SubmitButton>
      </div>
    </form>
  );
}
