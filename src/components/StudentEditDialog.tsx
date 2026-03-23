"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { StudentEditForm } from "@/components/StudentEditForm";

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
  };
  onSaved?: () => void;
}

export function StudentEditDialog({ student, onSaved }: StudentEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information for {student.full_name}
          </DialogDescription>
        </DialogHeader>
        <StudentEditForm
          student={student as Record<string, unknown> & { id: string; full_name: string }}
          embedded
          onSaved={() => {
            setOpen(false);
            if (onSaved) onSaved();
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
