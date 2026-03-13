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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentDocumentsPhotos } from "@/components/StudentDocumentsPhotos";
import { CameraCaptureButton } from "@/components/CameraCapture";
import { GradeDivisionYearSelects } from "@/components/GradeDivisionYearSelects";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload, FileText, ImageIcon } from "lucide-react";
import {
  uploadStudentFiles,
  type PendingPhotos,
  type PendingDocuments,
} from "@/lib/student-uploads";
import { upsertCurrentEnrollment } from "@/app/dashboard/students/actions";
import { useToast } from "@/hooks/use-toast";

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
const ADMISSION_TYPES = ["regular", "transfer", "re-admission"] as const;

const defaultForm = () => ({
  full_name: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  address: "",
  district: "",
  grade: "",
  division: "",
  roll_number: "",
  admission_date: "",
  admission_type: "regular",
  academic_year: "",
  status: "active",
  category: "",
  religion: "",
  caste: "",
  birth_place: "",
  last_school: "",
  aadhar_no: "",
  pen_no: "",
  apaar_id: "",
  father_name: "",
  mother_name: "",
  parent_contact: "",
  mother_contact: "",
  parent_email: "",
  guardian_name: "",
  guardian_contact: "",
  guardian_email: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  fee_concession_amount: "",
  fee_concession_reason: "",
  height: "",
  weight: "",
  hobby: "",
  sign_of_identity: "",
  refer_name: "",
  father_education: "",
  father_occupation: "",
  mother_education: "",
  mother_occupation: "",
  whatsapp_no: "",
  account_holder_name: "",
  bank_name: "",
  bank_branch: "",
  bank_ifsc: "",
  account_no: "",
  guardian_education: "",
  guardian_occupation: "",
  udise_id: "",
  gr_number: "",
  second_language: "",
  notes: "",
  is_rte_quota: false,
});

export default function StudentEntryForm({
  defaultAcademicYear,
}: {
  defaultAcademicYear?: string;
} = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getDefaultFormWithYear = () => ({
    ...defaultForm(),
    ...(defaultAcademicYear ? { academic_year: defaultAcademicYear } : {}),
  });
  const [form, setForm] = useState(getDefaultFormWithYear);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotos>({});
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocuments>({});

  const requiredFields: { key: keyof ReturnType<typeof defaultForm>; label: string }[] = [
    { key: "full_name", label: "Full name" },
    { key: "date_of_birth", label: "Date of birth" },
    { key: "address", label: "Address" },
    { key: "gender", label: "Gender" },
    { key: "blood_group", label: "Blood group" },
    { key: "category", label: "Category" },
    { key: "father_name", label: "Father name" },
    { key: "mother_name", label: "Mother name" },
    { key: "parent_contact", label: "Parent contact" },
    { key: "whatsapp_no", label: "WhatsApp no" },
    { key: "grade", label: "Grade" },
    { key: "division", label: "Division" },
    { key: "admission_type", label: "Admission type" },
    { key: "admission_date", label: "Admission date" },
    { key: "academic_year", label: "Academic year" },
    { key: "roll_number", label: "Roll number" },
    { key: "aadhar_no", label: "Aadhar No" },
    { key: "pen_no", label: "PEN No" },
    { key: "apaar_id", label: "APAR ID" },
    { key: "udise_id", label: "UDISE ID" },
    { key: "gr_number", label: "GR Number" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (const { key, label } of requiredFields) {
      const val = form[key];
      const str = typeof val === "string" ? val.trim() : "";
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
      const student_id = `STU-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        address: form.address.trim() || null,
        district: form.district.trim() || null,
        grade: form.grade.trim() || null,
        division: form.division.trim() || null,
        roll_number: form.roll_number ? parseInt(form.roll_number) : null,
        admission_date: form.admission_date || null,
        admission_type: form.admission_type || null,
        academic_year: form.academic_year.trim() || null,
        status: form.status,
        student_id,
        category: form.category || null,
        religion: form.religion.trim() || null,
        caste: form.caste.trim() || null,
        birth_place: form.birth_place.trim() || null,
        last_school: form.last_school.trim() || null,
        aadhar_no: form.aadhar_no.trim() || null,
        pen_no: form.pen_no.trim() || null,
        apaar_id: form.apaar_id.trim() || null,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        parent_name: form.father_name.trim() || form.mother_name.trim() || null,
        parent_contact: form.parent_contact.trim() || null,
        mother_contact: form.mother_contact.trim() || null,
        parent_email: form.parent_email.trim() || null,
        guardian_name: form.guardian_name.trim() || null,
        guardian_contact: form.guardian_contact.trim() || null,
        guardian_email: form.guardian_email.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_number: form.emergency_contact_number.trim() || null,
        fee_concession_amount: form.fee_concession_amount ? parseFloat(form.fee_concession_amount) : null,
        fee_concession_reason: form.fee_concession_reason.trim() || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
        hobby: form.hobby.trim() || null,
        sign_of_identity: form.sign_of_identity.trim() || null,
        refer_name: form.refer_name.trim() || null,
        father_education: form.father_education.trim() || null,
        father_occupation: form.father_occupation.trim() || null,
        mother_education: form.mother_education.trim() || null,
        mother_occupation: form.mother_occupation.trim() || null,
        whatsapp_no: form.whatsapp_no.trim() || null,
        account_holder_name: form.account_holder_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_branch: form.bank_branch.trim() || null,
        bank_ifsc: form.bank_ifsc.trim() || null,
        account_no: form.account_no.trim() || null,
        guardian_education: form.guardian_education.trim() || null,
        guardian_occupation: form.guardian_occupation.trim() || null,
        udise_id: form.udise_id.trim() || null,
        gr_number: form.gr_number.trim() || null,
        second_language: form.second_language || null,
        notes: form.notes.trim() || null,
        is_rte_quota: form.is_rte_quota,
      };

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
        const enrollResult = await upsertCurrentEnrollment(inserted.id, form.grade, form.division);
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
        setForm(getDefaultFormWithYear());
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
            setForm(getDefaultFormWithYear());
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
                  <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required />
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
                  <Input
                    value={form.religion}
                    onChange={(e) => set("religion", e.target.value)}
                    placeholder="e.g. Hindu"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caste</Label>
                  <Input value={form.caste} onChange={(e) => set("caste", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" required />
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
                  <Label>Aadhar No *</Label>
                  <Input
                    value={form.aadhar_no}
                    onChange={(e) => set("aadhar_no", e.target.value)}
                    placeholder="12-digit"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>PEN No *</Label>
                  <Input value={form.pen_no} onChange={(e) => set("pen_no", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>APAR ID *</Label>
                  <Input value={form.apaar_id} onChange={(e) => set("apaar_id", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>UDISE ID *</Label>
                  <Input value={form.udise_id} onChange={(e) => set("udise_id", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>GR Number *</Label>
                  <Input value={form.gr_number} onChange={(e) => set("gr_number", e.target.value)} required />
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
                  <Label htmlFor="father_name">Father name *</Label>
                  <Input id="father_name" value={form.father_name} onChange={(e) => set("father_name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother_name">Mother name *</Label>
                  <Input id="mother_name" value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent_contact">Father contact *</Label>
                  <Input id="parent_contact" type="tel" value={form.parent_contact} onChange={(e) => set("parent_contact", e.target.value)} required />
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
                  <Input
                    type="tel"
                    value={form.whatsapp_no}
                    onChange={(e) => set("whatsapp_no", e.target.value)}
                    required
                  />
              </div>
              <div className="space-y-2">
                <Label>Emergency contact name</Label>
                <Input
                  value={form.emergency_contact_name}
                  onChange={(e) => set("emergency_contact_name", e.target.value)}
                  placeholder="Person to call in emergency"
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency contact mobile</Label>
                <Input
                  type="tel"
                  value={form.emergency_contact_number}
                  onChange={(e) => set("emergency_contact_number", e.target.value)}
                  placeholder="Emergency phone number"
                />
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
                  <Label>Admission type *</Label>
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
                  <Label htmlFor="admission_date">Admission date *</Label>
                  <Input id="admission_date" type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} required />
                </div>
                <GradeDivisionYearSelects
                  grade={form.grade}
                  division={form.division}
                  academicYear={form.academic_year}
                  onGradeChange={(v) => {
                    set("grade", v);
                    set("division", "");
                  }}
                  onDivisionChange={(v) => set("division", v)}
                  onAcademicYearChange={(v) => set("academic_year", v)}
                  gradeRequired
                  divisionRequired
                  academicYearRequired
                />
                <div className="space-y-2">
                  <Label>Roll number *</Label>
                  <Input
                    type="number"
                    value={form.roll_number}
                    onChange={(e) => set("roll_number", e.target.value)}
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last school</Label>
                  <Input value={form.last_school} onChange={(e) => set("last_school", e.target.value)} />
                </div>
                <div className="space-y-2" />
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
            <CardDescription>Fee concession and bank account for refunds.</CardDescription>
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
            <CardTitle className="text-base">Documents & Photos</CardTitle>
            <CardDescription>Upload Aadhar card, photographs, and other documents.</CardDescription>
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
