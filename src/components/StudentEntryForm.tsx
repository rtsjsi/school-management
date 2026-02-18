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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentDocumentsPhotos } from "@/components/StudentDocumentsPhotos";
import { Button } from "@/components/ui/button";
import { Upload, FileText, ImageIcon } from "lucide-react";
import {
  uploadStudentFiles,
  type PendingPhotos,
  type PendingDocuments,
} from "@/lib/student-uploads";

const PHOTO_ROLES = ["student", "mother", "father"] as const;
const PHOTO_LABELS: Record<(typeof PHOTO_ROLES)[number], string> = {
  student: "Student",
  mother: "Mother",
  father: "Father",
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
  email: "",
  phone_number: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  address: "",
  society: "",
  district: "",
  grade: "",
  section: "",
  roll_number: "",
  admission_date: "",
  admission_form_no: "",
  admission_type: "regular",
  student_type: "new",
  academic_year: "",
  status: "active",
  category: "",
  religion: "",
  caste: "",
  birth_place: "",
  last_school: "",
  aadhar_no: "",
  unique_id: "",
  pen_no: "",
  apaar_id: "",
  father_name: "",
  mother_name: "",
  parent_contact: "",
  mother_contact: "",
  parent_email: "",
  parent_relationship: "father",
  guardian_name: "",
  guardian_contact: "",
  guardian_email: "",
  fee_mafi_amount: "",
  fee_mafi_reason: "",
  all_fee_mafi: false,
  is_permanent: false,
  hostel_student: false,
  food_provided: false,
  prev_school_attendance: "",
  height: "",
  weight: "",
  handicap: false,
  minority: false,
  hobby: "",
  sign_of_identity: "",
  refer_name: "",
  father_birth_date: "",
  mother_birth_date: "",
  father_education: "",
  father_occupation: "",
  father_designation: "",
  mother_education: "",
  mother_occupation: "",
  mother_designation: "",
  parents_anniversary: "",
  whatsapp_no: "",
  yearly_income: "",
  fees_due_date: "",
  account_holder_name: "",
  bank_name: "",
  bank_branch: "",
  bank_ifsc: "",
  account_no: "",
  guardian_education: "",
  guardian_occupation: "",
  guardian_designation: "",
  transport_required: false,
  transport_route: "",
  transport_pickup_point: "",
  notes: "",
  is_rte_quota: false,
});

export default function StudentEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotos>({});
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocuments>({});

  const requiredFields: { key: keyof ReturnType<typeof defaultForm>; label: string }[] = [
    { key: "full_name", label: "Full name" },
    { key: "date_of_birth", label: "Date of birth" },
    { key: "address", label: "Address" },
    { key: "father_name", label: "Father name" },
    { key: "mother_name", label: "Mother name" },
    { key: "parent_contact", label: "Parent contact" },
    { key: "grade", label: "Grade" },
    { key: "section", label: "Section" },
    { key: "admission_date", label: "Admission date" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (const { key, label } of requiredFields) {
      const val = form[key];
      const str = typeof val === "string" ? val.trim() : "";
      if (!str) {
        setError(`${label} is required.`);
        return;
      }
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const student_id = `STU-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone_number: form.phone_number.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        address: form.address.trim() || null,
        society: form.society.trim() || null,
        district: form.district.trim() || null,
        grade: form.grade.trim() || null,
        section: form.section.trim() || null,
        roll_number: form.roll_number ? parseInt(form.roll_number) : null,
        admission_date: form.admission_date || null,
        admission_form_no: form.admission_form_no.trim() || null,
        admission_type: form.admission_type || null,
        student_type: form.student_type || null,
        academic_year: form.academic_year.trim() || null,
        status: form.status,
        student_id,
        category: form.category || null,
        religion: form.religion.trim() || null,
        caste: form.caste.trim() || null,
        birth_place: form.birth_place.trim() || null,
        last_school: form.last_school.trim() || null,
        aadhar_no: form.aadhar_no.trim() || null,
        unique_id: form.unique_id.trim() || null,
        pen_no: form.pen_no.trim() || null,
        apaar_id: form.apaar_id.trim() || null,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        parent_name: form.father_name.trim() || form.mother_name.trim() || null,
        parent_contact: form.parent_contact.trim() || null,
        mother_contact: form.mother_contact.trim() || null,
        parent_email: form.parent_email.trim() || null,
        parent_relationship: form.parent_relationship,
        guardian_name: form.guardian_name.trim() || null,
        guardian_contact: form.guardian_contact.trim() || null,
        guardian_email: form.guardian_email.trim() || null,
        fee_mafi_amount: form.fee_mafi_amount ? parseFloat(form.fee_mafi_amount) : null,
        fee_mafi_reason: form.fee_mafi_reason.trim() || null,
        all_fee_mafi: form.all_fee_mafi,
        is_permanent: form.is_permanent,
        hostel_student: form.hostel_student,
        food_provided: form.food_provided,
        prev_school_attendance: form.prev_school_attendance ? parseInt(form.prev_school_attendance) : null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
        handicap: form.handicap,
        minority: form.minority,
        hobby: form.hobby.trim() || null,
        sign_of_identity: form.sign_of_identity.trim() || null,
        refer_name: form.refer_name.trim() || null,
        father_birth_date: form.father_birth_date || null,
        mother_birth_date: form.mother_birth_date || null,
        father_education: form.father_education.trim() || null,
        father_occupation: form.father_occupation.trim() || null,
        father_designation: form.father_designation.trim() || null,
        mother_education: form.mother_education.trim() || null,
        mother_occupation: form.mother_occupation.trim() || null,
        mother_designation: form.mother_designation.trim() || null,
        parents_anniversary: form.parents_anniversary || null,
        whatsapp_no: form.whatsapp_no.trim() || null,
        yearly_income: form.yearly_income ? parseFloat(form.yearly_income) : null,
        fees_due_date: form.fees_due_date || null,
        account_holder_name: form.account_holder_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_branch: form.bank_branch.trim() || null,
        bank_ifsc: form.bank_ifsc.trim() || null,
        account_no: form.account_no.trim() || null,
        guardian_education: form.guardian_education.trim() || null,
        guardian_occupation: form.guardian_occupation.trim() || null,
        guardian_designation: form.guardian_designation.trim() || null,
        transport_required: form.transport_required,
        transport_route: form.transport_route.trim() || null,
        transport_pickup_point: form.transport_pickup_point.trim() || null,
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
        return;
      }

      if (inserted?.id) {
        const hasPending = Object.keys(pendingPhotos).length > 0 || Object.keys(pendingDocuments).length > 0;
        if (hasPending) {
          const { error: uploadErr } = await uploadStudentFiles(
            supabase,
            inserted.id,
            pendingPhotos,
            pendingDocuments
          );
          if (uploadErr) {
            setError(`Student created but upload failed: ${uploadErr}`);
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
      setError("Something went wrong.");
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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-7">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
          <TabsTrigger value="fee">Fee & Bank</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
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
                  <Label htmlFor="date_of_birth">Date of birth *</Label>
                  <Input id="date_of_birth" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required />
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full address" required />
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
                  <Label>Apaar ID</Label>
                  <Input value={form.apaar_id} onChange={(e) => set("apaar_id", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents" className="space-y-4 mt-4">
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
                  <Label htmlFor="parent_contact">Father / Parent contact *</Label>
                  <Input id="parent_contact" type="tel" value={form.parent_contact} onChange={(e) => set("parent_contact", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Mother contact</Label>
                  <Input type="tel" value={form.mother_contact} onChange={(e) => set("mother_contact", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Parent email</Label>
                  <Input type="email" value={form.parent_email} onChange={(e) => set("parent_email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp no</Label>
                  <Input type="tel" value={form.whatsapp_no} onChange={(e) => set("whatsapp_no", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Parent relationship</Label>
                  <Select value={form.parent_relationship} onValueChange={(v) => set("parent_relationship", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Father birth date</Label>
                  <Input type="date" value={form.father_birth_date} onChange={(e) => set("father_birth_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother birth date</Label>
                  <Input type="date" value={form.mother_birth_date} onChange={(e) => set("mother_birth_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Parents anniversary</Label>
                  <Input type="date" value={form.parents_anniversary} onChange={(e) => set("parents_anniversary", e.target.value)} />
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
                  <Label>Father designation</Label>
                  <Input value={form.father_designation} onChange={(e) => set("father_designation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother education</Label>
                  <Input value={form.mother_education} onChange={(e) => set("mother_education", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother occupation</Label>
                  <Input value={form.mother_occupation} onChange={(e) => set("mother_occupation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother designation</Label>
                  <Input value={form.mother_designation} onChange={(e) => set("mother_designation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Yearly income (Rs)</Label>
                  <Input type="number" value={form.yearly_income} onChange={(e) => set("yearly_income", e.target.value)} placeholder="0" />
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
                  <Label>Guardian education</Label>
                  <Input value={form.guardian_education} onChange={(e) => set("guardian_education", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Guardian occupation</Label>
                  <Input value={form.guardian_occupation} onChange={(e) => set("guardian_occupation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Guardian designation</Label>
                  <Input value={form.guardian_designation} onChange={(e) => set("guardian_designation", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admission & Academic Details</CardTitle>
              <CardDescription>Grade, section, admission type, and previous school.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Admission form no</Label>
                  <Input value={form.admission_form_no} onChange={(e) => set("admission_form_no", e.target.value)} />
                </div>
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
                  <Label>Student type</Label>
                  <Select value={form.student_type} onValueChange={(v) => set("student_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="continuing">Continuing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admission_date">Admission date *</Label>
                  <Input id="admission_date" type="date" value={form.admission_date} onChange={(e) => set("admission_date", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Grade *</Label>
                  <Input value={form.grade} onChange={(e) => set("grade", e.target.value)} placeholder="e.g. 10" required />
                </div>
                <div className="space-y-2">
                  <Label>Section *</Label>
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
        </TabsContent>

        <TabsContent value="other" className="space-y-4 mt-4">
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
        </TabsContent>

        <TabsContent value="fee" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Concession & Bank Details</CardTitle>
              <CardDescription>Fee mafi, fees due date, and bank account for refunds.</CardDescription>
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
                <div className="space-y-2">
                  <Label>Fees due date</Label>
                  <Input type="date" value={form.fees_due_date} onChange={(e) => set("fees_due_date", e.target.value)} />
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
        </TabsContent>

        <TabsContent value="transport" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transport Details</CardTitle>
              <CardDescription>School transport and pickup information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="transport" checked={form.transport_required} onCheckedChange={(c) => set("transport_required", !!c)} />
                  <Label htmlFor="transport" className="font-normal">Transport required</Label>
                </div>
                <div className="space-y-2">
                  <Label>Transport route</Label>
                  <Input value={form.transport_route} onChange={(e) => set("transport_route", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Pickup / drop point</Label>
                  <Input value={form.transport_pickup_point} onChange={(e) => set("transport_pickup_point", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents & Photos</CardTitle>
              <CardDescription>
                Select files now. They will be uploaded when you click &quot;Add student&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Photos</Label>
                <p className="text-xs text-muted-foreground mb-3">Student, Mother, Father (image only)</p>
                <div className="grid grid-cols-3 gap-4">
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
                        <div className="flex gap-1">
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
        </TabsContent>
      </Tabs>

      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add student
      </SubmitButton>
    </form>
  );
}
