"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentDocumentsPhotos } from "@/components/StudentDocumentsPhotos";
import { CameraCaptureButton } from "@/components/CameraCapture";
import { StandardDivisionYearSelects } from "@/components/StandardDivisionYearSelects";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";
import { Upload, FileText, ImageIcon } from "lucide-react";
import {
  uploadStudentFiles,
  type PendingPhotos,
  type PendingDocuments,
} from "@/lib/student-uploads";
import { upsertCurrentEnrollment } from "@/app/(workspace)/dashboard/students/actions";
import { useToast } from "@/hooks/use-toast";
import { IN_STATES } from "@/lib/student-form";

const PHOTO_ROLES = ["student"] as const;
const PHOTO_LABELS: Record<(typeof PHOTO_ROLES)[number], string> = {
  student: "Student",
};
const DOC_TYPES = ["admission_form", "leaving_cert", "birth_cert", "aadhar", "caste_cert", "other"] as const;
const DOC_LABELS: Record<(typeof DOC_TYPES)[number], string> = {
  admission_form: "Admission form",
  leaving_cert: "Leaving certificate",
  birth_cert: "Birth certificate",
  aadhar: "Aadhar card",
  caste_cert: "Caste certificate",
  other: "Other document",
};

const CATEGORIES = ["general", "obc", "sc", "st", "other"] as const;

const defaultForm = () => ({
  full_name: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  present_address_line1: "",
  present_address_line2: "",
  present_city: "",
  present_taluka: "",
  present_district: "",
  present_state: "",
  present_pincode: "",
  present_country: "India",
  mother_tongue: "",
  standard: "",
  division: "",
  roll_number: "",
  admission_date: "",
  status: "active",
  category: "",
  religion: "",
  caste: "",
  birth_place: "",
  last_school: "",
  previous_school_state_unique_id: "",
  aadhar_no: "",
  pen_no: "",
  apaar_id: "",
  father_name: "",
  father_contact: "",
  parent_email: "",
  mother_name: "",
  mother_contact: "",
  fee_concession_amount: "",
  fee_concession_reason: "",
  height: "",
  weight: "",
  whatsapp_no: "",
  account_holder_name: "",
  bank_name: "",
  bank_branch: "",
  bank_ifsc: "",
  account_no: "",
  udise_id: "",
  gr_number: "",
  second_language: "",
  is_rte_quota: false,
});

export default function StudentEntryForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotos>({});
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocuments>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        mother_tongue: form.mother_tongue.trim() || null,
        standard: form.standard.trim() || null,
        division: form.division.trim() || null,
        roll_number: form.roll_number ? parseInt(form.roll_number) : null,
        admission_date: form.admission_date || null,
        status: form.status,
        category: form.category || null,
        religion: form.religion.trim() || null,
        caste: form.caste.trim() || null,
        birth_place: form.birth_place.trim() || null,
        last_school: form.last_school.trim() || null,
        previous_school_state_unique_id: form.previous_school_state_unique_id.trim() || null,
        aadhar_no: form.aadhar_no.trim() || null,
        pen_no: form.pen_no.trim() || null,
        apaar_id: form.apaar_id.trim() || null,
        father_name: form.father_name.trim() || null,
        father_contact: form.father_contact.trim() || null,
        parent_email: form.parent_email.trim() || null,
        mother_name: form.mother_name.trim() || null,
        mother_contact: form.mother_contact.trim() || null,
        fee_concession_amount: form.fee_concession_amount ? parseFloat(form.fee_concession_amount) : null,
        fee_concession_reason: form.fee_concession_reason.trim() || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
        whatsapp_no: form.whatsapp_no.trim() || null,
        account_holder_name: form.account_holder_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_branch: form.bank_branch.trim() || null,
        bank_ifsc: form.bank_ifsc.trim() || null,
        account_no: form.account_no.trim() || null,
        udise_id: form.udise_id.trim() || null,
        gr_number: form.gr_number.trim() || null,
        second_language: form.second_language || null,
        is_rte_quota: form.is_rte_quota,
      };

      const present = {
        line1: form.present_address_line1,
        line2: form.present_address_line2,
        city: form.present_city,
        taluka: form.present_taluka,
        district: form.present_district,
        state: form.present_state,
        pincode: form.present_pincode,
        country: form.present_country || "India",
      };

      payload.present_address_line1 = present.line1.trim() || null;
      payload.present_address_line2 = present.line2.trim() || null;
      payload.present_city = present.city.trim() || null;
      payload.present_taluka = present.taluka.trim() || null;
      payload.present_district = present.district.trim() || null;
      payload.present_state = present.state.trim() || null;
      payload.present_pincode = present.pincode.trim() || null;
      payload.present_country = (present.country || "India").trim() || "India";

      // Check unique fields: gr_number, udise_id, pen_no, apaar_id
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
          .or(orFilter);

        if (dupError) {
          console.error("Duplicate unique fields check error:", dupError);
        } else if (dupStudents && dupStudents.length > 0) {
          for (const student of dupStudents) {
            for (const item of uniqueFieldsToCheck) {
              if (student[item.field as keyof typeof student] === item.value) {
                const msg = `${item.label} "${item.value}" is already assigned to student "${student.full_name}".`;
                setError(msg);
                toast({ variant: "destructive", title: `Duplicate ${item.label}`, description: msg });
                return;
              }
            }
          }
        }
      }

      // Check roll number in the same standard and division
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
          .limit(1)
          .maybeSingle();

        if (rollDupError) {
          console.error("Roll number duplicate check error:", rollDupError);
        } else if (rollDup) {
          const msg = `Roll number ${rollNumber} is already assigned to student "${rollDup.full_name}" in class "${standard} - ${division}".`;
          setError(msg);
          toast({ variant: "destructive", title: "Duplicate Roll Number", description: msg });
          return;
        }
      }

      const { data: inserted, error: err } = await supabase
        .from("students")
        .insert(payload)
        .select("id")
        .single();

      if (err) {
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Could not add student",
          description: err.message,
        });
        return;
      }

      if (inserted?.id) {
        const enrollResult = await upsertCurrentEnrollment(inserted.id, form.standard, form.division);
        if (!enrollResult.ok) {
          const message = `Student created but enrollment failed: ${enrollResult.error}`;
          setError(message);
          toast({
            variant: "destructive",
            title: "Enrollment issue",
            description: message,
          });
          return;
        }
        const hasPending = Object.keys(pendingPhotos).length > 0 || Object.keys(pendingDocuments).length > 0;
        if (hasPending) {
          const { error: uploadErr } = await uploadStudentFiles(
            supabase,
            inserted.id,
            pendingPhotos,
            pendingDocuments
          );
          if (uploadErr) {
            const message = `Student created but upload failed: ${uploadErr}`;
            setError(message);
            toast({
              variant: "destructive",
              title: "Upload issue",
              description: message,
            });
          }
        }
        setCreatedStudentId(inserted.id);
        setPendingPhotos({});
        setPendingDocuments({});
      } else {
        setForm(defaultForm());
      }
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

  const set = (key: keyof ReturnType<typeof defaultForm>, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  if (createdStudentId) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-md">
          Student added successfully. You can now upload documents and photos below.
        </p>
        <StudentDocumentsPhotos studentId={createdStudentId} />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCreatedStudentId(null);
            setForm(defaultForm());
          }}
        >
          Add another student
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}

      <div className="space-y-6">
        {/* 1. Personal & Identity */}
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
                <Label htmlFor="date_of_birth">Date of birth *</Label>
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
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
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
                <Input
                  type="number"
                  value={form.roll_number}
                  onChange={(e) => set("roll_number", e.target.value)}
                  min={0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Present Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Present address line 1 *</Label>
              <Textarea
                value={form.present_address_line1}
                onChange={(e) => set("present_address_line1", e.target.value)}
                placeholder="House/Flat, Society/Street, Area"
                rows={2}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Present address line 2</Label>
              <Textarea
                value={form.present_address_line2}
                onChange={(e) => set("present_address_line2", e.target.value)}
                placeholder="Landmark / Additional details"
                rows={2}
              />
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
              <Input
                inputMode="numeric"
                value={form.present_pincode}
                onChange={(e) => set("present_pincode", e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                placeholder="6-digit"
              />
            </div>
            <div className="space-y-2">
              <Label>Present country</Label>
              <Input value={form.present_country} onChange={(e) => set("present_country", e.target.value)} placeholder="India" />
            </div>
          </div>
          </CardContent>
        </Card>

        {/* 3. Parents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="father_name">Father name *</Label>
                <Input id="father_name" value={form.father_name} onChange={(e) => set("father_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Father contact</Label>
                <Input type="tel" value={form.father_contact} onChange={(e) => set("father_contact", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_name">Mother name *</Label>
                <Input id="mother_name" value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
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
                <Label>WhatsApp no *</Label>
                <Input type="tel" value={form.whatsapp_no} onChange={(e) => set("whatsapp_no", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Admission & Academic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admission & Academic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admission_date">Admission date *</Label>
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

        {/* 5. Previous School */}
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

        {/* 6. Fee Concession & Bank */}
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

        {/* 7. Other Details */}
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
          <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Photos</Label>
                <p className="text-xs text-muted-foreground mb-3">Student photo (image only)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {PHOTO_ROLES.map((role) => {
                    const file = pendingPhotos[role];
                    return (
                      <div key={role} className="border rounded-lg p-3 flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                          {file ? (
                            <span className="text-xs text-center px-1 truncate w-full">{file.name}</span>
                          ) : (
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs font-medium">{PHOTO_LABELS[role]}</span>
                        <div className="flex flex-wrap gap-1">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setPendingPhotos((p) => ({ ...p, [role]: f }));
                                e.target.value = "";
                              }}
                            />
                            <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                              <span>
                                <Upload className="h-3 w-3" />
                                {file ? "Replace" : "Upload"}
                              </span>
                            </Button>
                          </label>
                          {role === "student" && (
                            <CameraCaptureButton
                              onCapture={(f) => setPendingPhotos((p) => ({ ...p, student: f }))}
                            />
                          )}
                          {file && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPendingPhotos((p) => {
                                const next = { ...p };
                                delete next[role];
                                return next;
                              })}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Documents</Label>
                <p className="text-xs text-muted-foreground mb-3">PDF or image (Aadhar, birth cert, etc.)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DOC_TYPES.map((docType) => {
                    const file = pendingDocuments[docType];
                    return (
                      <div
                        key={docType}
                        className="flex items-center justify-between rounded-md border p-2 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{DOC_LABELS[docType]}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) setPendingDocuments((p) => ({ ...p, [docType]: f }));
                                e.target.value = "";
                              }}
                            />
                            <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                              <span>
                                <Upload className="h-3 w-3" />
                                {file ? "Replace" : "Upload"}
                              </span>
                            </Button>
                          </label>
                          {file && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setPendingDocuments((p) => {
                                const next = { ...p };
                                delete next[docType];
                                return next;
                              })}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-start">
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/students">Cancel</Link>
        </Button>
        <SubmitButton loading={loading} loadingLabel="Adding…">
          Add student
        </SubmitButton>
      </div>
    </form>
  );
}
