"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createStandard, updateStandard, createDivision } from "@/app/(workspace)/dashboard/classes/actions";
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
import { Plus, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { PdfIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { exportStandardsPdf as exportStandardsReportPdf } from "@/lib/standards-report-export";
import { computeStandardCompleteness, completenessBadgeClassNames } from "@/lib/master-data-completeness";

type DivisionRow = { id: string; name: string; sort_order: number };

const SECTION_LABELS: Record<string, string> = {
  pre_primary: "Pre-primary",
  primary: "Primary",
  secondary: "Secondary",
  higher_secondary: "Higher Secondary",
};

const SECTIONS = ["pre_primary", "primary", "secondary", "higher_secondary"] as const;

type StandardRow = {
  id: string;
  name: string;
  section: string;
  sort_order: number;
  standard_divisions?: { id: string }[] | null;
};

export function ClassManagement() {
  const school = useSchoolSettings();
  const router = useRouter();
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSection, setAddSection] = useState<string>("primary");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadStandards = useCallback(() => {
    supabase
      .from("standards")
      .select("id, name, section, sort_order, standard_divisions(id)")
      .order("sort_order")
      .then(({ data }) => setStandards((data ?? []) as StandardRow[]));
  }, [supabase]);

  useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  type StandardWithDivisions = {
    id: string;
    name: string;
    section: string;
    standard_divisions?: { name: string }[] | null;
  };

  const exportStandardsPdf = async () => {
    try {
      const { data, error } = await supabase
        .from("standards")
        .select("id, name, section, sort_order, standard_divisions(name)")
        .order("sort_order");
      if (error) {
        alert(error.message);
        return;
      }
      const standardsWithDivisions = (data ?? []) as StandardWithDivisions[];
      const rows =
        standardsWithDivisions.map((s) => ({
          standard: s.name,
          section: SECTION_LABELS[s.section] ?? s.section,
          divisions: ((s.standard_divisions as { name: string }[]) ?? []).map((d) => d.name).join(", "),
          divisionCount: ((s.standard_divisions as { name: string }[]) ?? []).length,
        })) ?? [];
      if (rows.length === 0) {
        alert("No standards to export.");
        return;
      }
      const sections = Array.from(new Set(rows.map((r) => r.section)));
      const subtitle = `${sections.join(", ")}  ·  ${rows.length} standard${rows.length !== 1 ? "s" : ""}`;
      const fileBase = `standards-report-${new Date().toISOString().slice(0, 10)}`;
      exportStandardsReportPdf(rows, fileBase, {
        schoolName: school.name || "Standards Report",
        subtitle,
      });
    } catch {
      alert("Failed to export standards.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const result = await createStandard(addName, addSection);
      if (result.ok) {
        setAddOpen(false);
        setAddName("");
        setAddSection("primary");
        loadStandards();
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

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add standard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add standard</DialogTitle>
                <DialogDescription>Add a new standard with name and section.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                {addError && (
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{addError}</p>
                )}
                <div className="space-y-2">
                  <Label>Standard name</Label>
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

          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
            onClick={exportStandardsPdf}
          >
            <PdfIcon className="h-4 w-4" />
            PDF
          </Button>
        </div>

        {standards.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Divisions</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Data&nbsp;%</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards.map((c) => (
                  <StandardRow
                    key={c.id}
                    row={c}
                    onSaved={() => {
                      loadStandards();
                      router.refresh();
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No standards. Add one above.</p>
        )}
      </CardContent>
    </Card>
  );
}

function StandardRow({
  row,
  onSaved,
}: {
  row: StandardRow;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(row.name);
  const [section, setSection] = useState(row.section);
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [addDivOpen, setAddDivOpen] = useState(false);
  const [addDivName, setAddDivName] = useState("");
  const [addDivLoading, setAddDivLoading] = useState(false);

  const loadDivisions = useCallback(() => {
    createClient()
      .from("standard_divisions")
      .select("id, name, sort_order")
      .eq("standard_id", row.id)
      .order("sort_order")
      .then(({ data }) => setDivisions((data ?? []) as DivisionRow[]));
  }, [row.id]);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  const handleSave = async () => {
    setLoading(true);
    const result = await updateStandard(row.id, name, section);
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
    const result = await createDivision(row.id, addDivName);
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

  const standardCompletenessRecord = useMemo(
    () =>
      ({
        name: name.trim() || row.name,
        section: section || row.section,
        sort_order: row.sort_order,
        standard_divisions:
          divisions.length > 0
            ? divisions.map((d) => ({ id: d.id }))
            : (row.standard_divisions ?? []),
      }) as Record<string, unknown>,
    [divisions, name, row.name, row.section, row.sort_order, row.standard_divisions, section],
  );
  const standardDataPct = computeStandardCompleteness(standardCompletenessRecord).percent;

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
        <TableCell className="text-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${completenessBadgeClassNames(standardDataPct)}`}
          >
            {standardDataPct}%
          </span>
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
        <TableCell className="font-medium">{row.name}</TableCell>
        <TableCell>
          <span className="text-sm">{SECTION_LABELS[row.section] ?? row.section}</span>
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
        <TableCell className="text-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${completenessBadgeClassNames(standardDataPct)}`}
          >
            {standardDataPct}%
          </span>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Divisions for {row.name}</span>
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
                      <DialogDescription>Add a division (e.g. A, B, C) for {row.name}.</DialogDescription>
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
