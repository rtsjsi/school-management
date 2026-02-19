"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createSubject } from "@/app/dashboard/classes/actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ClassRow = { id: string; name: string; section: string };
type SubjectRow = { id: string; name: string; evaluation_type: string };

export function SubjectMaster() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEvalType, setAddEvalType] = useState<"grade" | "mark">("mark");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("classes")
      .select("id, name, section")
      .order("sort_order")
      .then(({ data }) => setClasses((data ?? []) as ClassRow[]));
  }, []);

  const loadSubjects = () => {
    if (!selectedClassId) return;
    supabase
      .from("subjects")
      .select("id, name, evaluation_type")
      .eq("class_id", selectedClassId)
      .order("sort_order")
      .then(({ data }) => setSubjects((data ?? []) as SubjectRow[]));
  };

  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      return;
    }
    loadSubjects();
  }, [selectedClassId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const result = await createSubject(selectedClassId, addName, addEvalType);
      if (result.ok) {
        setAddOpen(false);
        setAddName("");
        setAddEvalType("mark");
        loadSubjects();
        router.refresh();
      } else {
        setAddError(result.error);
      }
    } catch {
      setAddError("Something went wrong.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject? Exam marks for it will be removed.")) return;
    const { deleteSubject } = await import("@/app/dashboard/classes/actions");
    const result = await deleteSubject(id);
    if (result.ok) {
      loadSubjects();
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedClassId && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subject</DialogTitle>
                  <DialogDescription>
                    Add a subject for {selectedClass?.name}. Choose evaluation type.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  {addError && (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{addError}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Subject name</Label>
                    <Input
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="e.g. English, Mathematics"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Evaluation type</Label>
                    <Select value={addEvalType} onValueChange={(v) => setAddEvalType(v as "grade" | "mark")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grade">Grade based (A, B, C, etc.)</SelectItem>
                        <SelectItem value="mark">Mark based (marks out of max)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addLoading}>
                      {addLoading ? "Adding…" : "Add"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {selectedClassId && (
          subjects.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Evaluation type</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s) => (
                    <SubjectRow key={s.id} subject={s} onDelete={handleDelete} onSaved={loadSubjects} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No subjects for this class. Click &quot;Add Subject&quot; to add.
            </p>
          )
        )}

        {!selectedClassId && classes.length > 0 && (
          <p className="text-sm text-muted-foreground py-4">Select a class to manage its subjects.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SubjectRow({
  subject,
  onDelete,
  onSaved,
}: {
  subject: SubjectRow;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [evalType, setEvalType] = useState<"grade" | "mark">(
    (subject.evaluation_type as "grade" | "mark") || "mark"
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const { updateSubject } = await import("@/app/dashboard/classes/actions");
    const result = await updateSubject(subject.id, name, evalType);
    setLoading(false);
    if (result.ok) {
      setEditing(false);
      onSaved();
    } else {
      alert(result.error);
    }
  };

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        </TableCell>
        <TableCell>
          <Select value={evalType} onValueChange={(v) => setEvalType(v as "grade" | "mark")}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grade">Grade</SelectItem>
              <SelectItem value="mark">Mark</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={loading}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{subject.name}</TableCell>
      <TableCell>
        <span className="text-sm">{subject.evaluation_type === "grade" ? "Grade based" : "Mark based"}</span>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(subject.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
