"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createClass, updateClass, deleteClass, createDivision, deleteDivision } from "@/app/dashboard/classes/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

type DivisionRow = { id: string; name: string; sort_order: number };

const SECTION_LABELS: Record<string, string> = {
  pre_primary: "Pre-primary",
  primary: "Primary",
  secondary: "Secondary",
  higher_secondary: "Higher Secondary",
};

const SECTIONS = ["pre_primary", "primary", "secondary", "higher_secondary"] as const;

type ClassRow = { id: string; name: string; section: string; sort_order: number };

export function ClassManagement() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSection, setAddSection] = useState<string>("primary");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const supabase = createClient();

  const loadClasses = () => {
    supabase
      .from("classes")
      .select("id, name, section, sort_order")
      .order("sort_order")
      .then(({ data }) => setClasses((data ?? []) as ClassRow[]));
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const result = await createClass(addName, addSection);
      if (result.ok) {
        setAddOpen(false);
        setAddName("");
        setAddSection("primary");
        loadClasses();
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
    if (!confirm("Delete this class? Subjects and student references may be affected.")) return;
    const result = await deleteClass(id);
    if (result.ok) {
      loadClasses();
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class list</CardTitle>
        <CardDescription>Classes by section. Add or edit classes; add divisions (A, B, C) under each.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add class</DialogTitle>
              <DialogDescription>Add a new class with name and section.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{addError}</p>
              )}
              <div className="space-y-2">
                <Label>Class name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. 1, Jr KG, 13"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={addSection} onValueChange={setAddSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SECTION_LABELS[s]}
                      </SelectItem>
                    ))}
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

        {classes.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Divisions</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <ClassRow
                    key={c.id}
                    cls={c}
                    onDelete={handleDelete}
                    onSaved={() => {
                      loadClasses();
                      router.refresh();
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No classes. Add one above.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ClassRow({
  cls,
  onDelete,
  onSaved,
}: {
  cls: ClassRow;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(cls.name);
  const [section, setSection] = useState(cls.section);
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [addDivOpen, setAddDivOpen] = useState(false);
  const [addDivName, setAddDivName] = useState("");
  const [addDivLoading, setAddDivLoading] = useState(false);

  const loadDivisions = () => {
    createClient()
      .from("class_divisions")
      .select("id, name, sort_order")
      .eq("class_id", cls.id)
      .order("sort_order")
      .then(({ data }) => setDivisions((data ?? []) as DivisionRow[]));
  };

  useEffect(() => {
    if (expanded) loadDivisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, cls.id]);

  const handleSave = async () => {
    setLoading(true);
    const result = await updateClass(cls.id, name, section);
    setLoading(false);
    if (result.ok) {
      setEditing(false);
      onSaved();
    } else {
      alert(result.error);
    }
  };

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddDivLoading(true);
    const result = await createDivision(cls.id, addDivName);
    setAddDivLoading(false);
    if (result.ok) {
      setAddDivOpen(false);
      setAddDivName("");
      loadDivisions();
      onSaved();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteDivision = async (id: string) => {
    if (!confirm("Delete this division?")) return;
    const result = await deleteDivision(id);
    if (result.ok) {
      loadDivisions();
      onSaved();
    } else {
      alert(result.error);
    }
  };

  if (editing) {
    return (
      <TableRow>
        <TableCell></TableCell>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        </TableCell>
        <TableCell>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SECTION_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell></TableCell>
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
    <>
      <TableRow>
        <TableCell className="w-8 p-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{cls.name}</TableCell>
        <TableCell>
          <span className="text-sm">{SECTION_LABELS[cls.section] ?? cls.section}</span>
        </TableCell>
        <TableCell>
          {divisions.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {divisions.map((d) => d.name).join(", ")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(cls.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={5} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Divisions for {cls.name}</span>
                <Dialog open={addDivOpen} onOpenChange={setAddDivOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1 h-7">
                      <Plus className="h-3 w-3" />
                      Add division
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Add division</DialogTitle>
                      <DialogDescription>Add a division (e.g. A, B, C) for {cls.name}.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddDivision} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Division name</Label>
                        <Input
                          value={addDivName}
                          onChange={(e) => setAddDivName(e.target.value)}
                          placeholder="e.g. A, B, C"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAddDivOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addDivLoading}>
                          {addDivLoading ? "Adding…" : "Add"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {divisions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {divisions.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1 rounded-md bg-background border px-2 py-1 text-sm"
                    >
                      {d.name}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDivision(d.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No divisions. Click &quot;Add division&quot; to add.</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
