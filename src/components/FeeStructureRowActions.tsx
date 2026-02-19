"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFeeStructure } from "@/app/dashboard/fees/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FeeStructureForm from "@/components/FeeStructureForm";
import { Pencil, Trash2 } from "lucide-react";

type Structure = {
  id: string;
  name: string;
  grade_from: string;
  grade_to: string;
  academic_year: string;
};

export function FeeStructureRowActions({ structure }: { structure: Structure }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete fee structure "${structure.name}"? This will remove all associated fee items.`)) return;
    setDeleting(true);
    const result = await deleteFeeStructure(structure.id);
    setDeleting(false);
    if (result.ok) {
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  return (
    <>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditOpen(true)}
          disabled={deleting}
          aria-label="Edit"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Fee Structure</DialogTitle>
          </DialogHeader>
          <FeeStructureForm
            structureId={structure.id}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
