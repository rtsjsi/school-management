"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { StandardDivisionYearSelects } from "@/components/StandardDivisionYearSelects";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { IN_STATES } from "@/lib/student-form";

interface StudentViewDialogProps {
  student: {
    id: string;
    student_id?: string;
    full_name: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    standard?: string;
    division?: string;
    roll_number?: number;
    admission_date?: string;
    academic_year?: string;
    status?: string;
    parent_name?: string;
    parent_contact?: string;
    parent_email?: string;
    guardian_name?: string;
    guardian_contact?: string;
    is_rte_quota?: boolean;
    present_address_line1?: string;
    present_city?: string;
    present_district?: string;
    present_state?: string;
    present_pincode?: string;
    present_country?: string;
    father_name?: string;
    mother_name?: string;
    mother_contact?: string;
    category?: string;
    religion?: string;
    aadhar_no?: string;
  };
}

export function StudentViewDialog({ student }: StudentViewDialogProps) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      transferred: "outline",
      graduated: "secondary",
      suspended: "destructive",
    };
    return map[status] || "default";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Eye className="h-3 w-3" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Student Information</DialogTitle>
          <DialogDescription>
            View-only details for {student.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <div className="text-primary text-2xl font-bold">
                    {student.full_name?.charAt(0) ?? "?"}
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">{student.full_name}</h2>
                {student.student_id && (
                  <div className="text-sm text-muted-foreground">
                    Student ID: {student.student_id}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Date of Birth</h3>
                <p className="text-lg">
                  {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Gender</h3>
                <p className="text-lg capitalize">{student.gender ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Blood Group</h3>
                <p className="text-lg capitalize">{student.blood_group ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Roll Number</h3>
                <p className="text-lg">{student.roll_number ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Admission Date</h3>
                <p className="text-lg">
                  {student.admission_date ? new Date(student.admission_date).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Academic Year</h3>
                <p className="text-lg">{student.academic_year ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Class Information */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Class Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Standard</h3>
                <p className="text-lg">{student.standard ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Division</h3>
                <p className="text-lg">{student.division ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <Badge variant={getStatusBadge(student.status ?? "active")}>
                  {(student.status ?? "active").toUpperCase()}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">RTE Quota</h3>
                <p className="text-lg">
                  {student.is_rte_quota ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Yes
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Parent/Guardian Name</h3>
                <p className="text-lg">{student.parent_name ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact Number</h3>
                <p className="text-lg">{student.parent_contact ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Email Address</h3>
                <p className="text-lg">{student.parent_email ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Guardian Name</h3>
                <p className="text-lg">{student.guardian_name ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Guardian Contact</h3>
                <p className="text-lg">{student.guardian_contact ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Address Information</h3>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Address Line 1</h3>
                <p className="text-lg">{student.present_address_line1 ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">City</h3>
                <p className="text-lg">{student.present_city ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">District</h3>
                <p className="text-lg">{student.present_district ?? "—"}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">State</h3>
                  <p className="text-lg">{student.present_state ?? "—"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Pincode</h3>
                  <p className="text-lg">{student.present_pincode ?? "—"}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Country</h3>
                <p className="text-lg">{student.present_country ?? "India"}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                <p className="text-lg capitalize">{student.category ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Religion</h3>
                <p className="text-lg">{student.religion ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Aadhar Number</h3>
                <p className="text-lg">{student.aadhar_no ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Father's Name</h3>
                <p className="text-lg">{student.father_name ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Mother's Name</h3>
                <p className="text-lg">{student.mother_name ?? "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Mother's Contact</h3>
                <p className="text-lg">{student.mother_contact ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}