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

export default function StudentEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedForm, setExpandedForm] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    phone_number: "",
    address: "",
    grade: "",
    section: "",
    roll_number: "",
    admission_date: "",
    academic_year: "",
    status: "active",
    parent_name: "",
    parent_contact: "",
    parent_email: "",
    parent_relationship: "father",
    guardian_name: "",
    guardian_contact: "",
    notes: "",
  });

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
      
      // Generate student_id if not provided
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const student_id = `STU-${new Date().getFullYear()}-${timestamp}-${random}`;

      const { error: err } = await supabase.from("students").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone_number: form.phone_number.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        address: form.address.trim() || null,
        grade: form.grade.trim() || null,
        section: form.section.trim() || null,
        roll_number: form.roll_number ? parseInt(form.roll_number) : null,
        admission_date: form.admission_date || null,
        academic_year: form.academic_year || null,
        status: form.status,
        student_id: student_id,
        parent_name: form.parent_name.trim() || null,
        parent_contact: form.parent_contact.trim() || null,
        parent_email: form.parent_email.trim() || null,
        parent_relationship: form.parent_relationship,
        guardian_name: form.guardian_name.trim() || null,
        guardian_contact: form.guardian_contact.trim() || null,
        notes: form.notes.trim() || null,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setForm({
        full_name: "",
        email: "",
        date_of_birth: "",
        gender: "",
        blood_group: "",
        phone_number: "",
        address: "",
        grade: "",
        section: "",
        roll_number: "",
        admission_date: "",
        academic_year: "",
        status: "active",
        parent_name: "",
        parent_contact: "",
        parent_email: "",
        parent_relationship: "father",
        guardian_name: "",
        guardian_contact: "",
        notes: "",
      });
      setExpandedForm(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}
      
      {/* Required Fields */}
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name *</Label>
        <Input
          id="full_name"
          type="text"
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          placeholder="e.g. John Doe"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="student@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone</Label>
          <Input
            id="phone_number"
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select value={form.gender} onValueChange={(value) => setForm((p) => ({ ...p, gender: value }))}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="grade">Grade *</Label>
          <Input
            id="grade"
            type="text"
            value={form.grade}
            onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            placeholder="e.g. 10"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="section">Section *</Label>
          <Input
            id="section"
            type="text"
            value={form.section}
            onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
            placeholder="e.g. A"
            required
          />
        </div>
      </div>

      {/* Toggle for expanded form */}
      <button
        type="button"
        onClick={() => setExpandedForm(!expandedForm)}
        className="text-sm text-primary hover:text-primary/90 font-medium"
      >
        {expandedForm ? "- Hide" : "+ Show"} Additional Details
      </button>

      {/* Extended Fields */}
      {expandedForm && (
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood Group</Label>
              <Select value={form.blood_group} onValueChange={(value) => setForm((p) => ({ ...p, blood_group: value }))}>
                <SelectTrigger id="blood_group">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll_number">Roll Number</Label>
              <Input
                id="roll_number"
                type="number"
                value={form.roll_number}
                onChange={(e) => setForm((p) => ({ ...p, roll_number: e.target.value }))}
                placeholder="e.g. 1"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Full residential address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admission_date">Admission Date</Label>
              <Input
                id="admission_date"
                type="date"
                value={form.admission_date}
                onChange={(e) => setForm((p) => ({ ...p, admission_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                type="text"
                value={form.academic_year}
                onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))}
                placeholder="e.g. 2024-2025"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm((p) => ({ ...p, status: value }))}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parent/Guardian Section */}
          <div className="pt-4 border-t border-border/50">
            <h3 className="text-sm font-semibold mb-3">Parent/Guardian Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent_name">Parent Name</Label>
                <Input
                  id="parent_name"
                  type="text"
                  value={form.parent_name}
                  onChange={(e) => setForm((p) => ({ ...p, parent_name: e.target.value }))}
                  placeholder="Parent/Guardian name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_relationship">Relationship</Label>
                <Select value={form.parent_relationship} onValueChange={(value) => setForm((p) => ({ ...p, parent_relationship: value }))}>
                  <SelectTrigger id="parent_relationship">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="parent_contact">Contact Number</Label>
                <Input
                  id="parent_contact"
                  type="tel"
                  value={form.parent_contact}
                  onChange={(e) => setForm((p) => ({ ...p, parent_contact: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_email">Email</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => setForm((p) => ({ ...p, parent_email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="guardian_name">Guardian Name (if different)</Label>
              <Input
                id="guardian_name"
                type="text"
                value={form.guardian_name}
                onChange={(e) => setForm((p) => ({ ...p, guardian_name: e.target.value }))}
                placeholder="Alternative guardian name"
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="guardian_contact">Guardian Contact</Label>
              <Input
                id="guardian_contact"
                type="tel"
                value={form.guardian_contact}
                onChange={(e) => setForm((p) => ({ ...p, guardian_contact: e.target.value }))}
                placeholder="Guardian phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              type="text"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional notes or remarks"
            />
          </div>
        </div>
      )}

      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add student
      </SubmitButton>
    </form>
  );
}
