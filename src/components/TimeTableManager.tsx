"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  saveTimetableSettings,
  saveTimetableEntries,
  type TimetableSettingsPayload,
  type TimetableEntryPayload,
} from "@/app/(workspace)/dashboard/academic-setup/timetable-actions";
import {
  generateTimetable,
  calculatePeriodSlots,
  countTeachingPeriods,
  formatTimeDisplay,
  type SubjectForTimetable,
  type PeriodSlot,
} from "@/lib/timetable-generator";
import {
  exportTimetablePdf,
  type TimetablePdfEntry,
} from "@/lib/timetable-pdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wand2, Save, Trash2, Settings2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { PdfIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NO_SUBJECT = "__none__";

type StandardRow = { id: string; name: string; section: string };
type SubjectRow = { id: string; name: string };
type SettingsRow = {
  id: string;
  standard_id: string;
  school_start_time: string;
  school_end_time: string;
  period_duration_minutes: number;
  num_breaks: number;
  periods_before_break_1: number;
  break_1_duration_minutes: number;
  periods_before_break_2: number | null;
  break_2_duration_minutes: number | null;
};
type EntryRow = {
  id: string;
  standard_id: string;
  day_of_week: number;
  period_number: number;
  subject_id: string | null;
  subject_name_override: string | null;
};

export function TimeTableManager() {
  const school = useSchoolSettings();
  const supabase = useMemo(() => createClient(), []);

  // Data state
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  // Settings form state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formStartTime, setFormStartTime] = useState("09:30");
  const [formEndTime, setFormEndTime] = useState("14:15");
  const [formPeriodDuration, setFormPeriodDuration] = useState("35");
  const [formNumBreaks, setFormNumBreaks] = useState("2");
  const [formPeriodsBeforeBreak1, setFormPeriodsBeforeBreak1] = useState("2");
  const [formBreak1Duration, setFormBreak1Duration] = useState("15");
  const [formPeriodsBeforeBreak2, setFormPeriodsBeforeBreak2] = useState("3");
  const [formBreak2Duration, setFormBreak2Duration] = useState("25");
  const [classTeacher, setClassTeacher] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load standards
  useEffect(() => {
    supabase
      .from("standards")
      .select("id, name, section")
      .order("sort_order")
      .then(({ data }) => setStandards((data ?? []) as StandardRow[]));
  }, [supabase]);

  // Load subjects + settings + entries when standard changes
  const loadDataForStandard = useCallback(
    (stdId: string) => {
      if (!stdId) {
        setSubjects([]);
        setSettings(null);
        setEntries([]);
        return;
      }
      Promise.all([
        supabase
          .from("subjects")
          .select("id, name")
          .eq("standard_id", stdId)
          .order("sort_order"),
        supabase
          .from("timetable_settings")
          .select("*")
          .eq("standard_id", stdId)
          .maybeSingle(),
        supabase
          .from("timetable_entries")
          .select("*")
          .eq("standard_id", stdId)
          .order("day_of_week")
          .order("period_number"),
      ]).then(([subjRes, settRes, entRes]) => {
        setSubjects((subjRes.data ?? []) as SubjectRow[]);
        const sett = settRes.data as SettingsRow | null;
        setSettings(sett);
        setEntries((entRes.data ?? []) as EntryRow[]);
        // Populate form from existing settings
        if (sett) {
          setFormStartTime(sett.school_start_time.slice(0, 5));
          setFormEndTime(sett.school_end_time.slice(0, 5));
          setFormPeriodDuration(String(sett.period_duration_minutes));
          setFormNumBreaks(String(sett.num_breaks));
          setFormPeriodsBeforeBreak1(String(sett.periods_before_break_1));
          setFormBreak1Duration(String(sett.break_1_duration_minutes));
          setFormPeriodsBeforeBreak2(String(sett.periods_before_break_2 ?? 3));
          setFormBreak2Duration(String(sett.break_2_duration_minutes ?? 25));
        }
      });
    },
    [supabase]
  );

  useEffect(() => {
    loadDataForStandard(selectedStandardId);
  }, [selectedStandardId, loadDataForStandard]);

  // Compute period slots from current form settings
  const currentFormSettings = useMemo(() => {
    const numBreaks = parseInt(formNumBreaks) || 1;
    return {
      school_start_time: formStartTime,
      school_end_time: formEndTime,
      period_duration_minutes: parseInt(formPeriodDuration) || 35,
      num_breaks: numBreaks,
      periods_before_break_1: parseInt(formPeriodsBeforeBreak1) || 2,
      break_1_duration_minutes: parseInt(formBreak1Duration) || 15,
      periods_before_break_2: numBreaks >= 2 ? parseInt(formPeriodsBeforeBreak2) || 3 : null,
      break_2_duration_minutes: numBreaks >= 2 ? parseInt(formBreak2Duration) || 25 : null,
    };
  }, [
    formStartTime, formEndTime, formPeriodDuration, formNumBreaks,
    formPeriodsBeforeBreak1, formBreak1Duration, formPeriodsBeforeBreak2, formBreak2Duration,
  ]);

  const periodSlots = useMemo(() => calculatePeriodSlots(currentFormSettings), [currentFormSettings]);
  const teachingPeriodCount = useMemo(() => countTeachingPeriods(periodSlots), [periodSlots]);

  // Save settings handler
  const handleSaveSettings = async () => {
    if (!selectedStandardId) return;
    setSaving(true);
    setError(null);
    const payload: TimetableSettingsPayload = currentFormSettings;
    const result = await saveTimetableSettings(selectedStandardId, payload);
    setSaving(false);
    if (result.ok) {
      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
      loadDataForStandard(selectedStandardId);
    } else {
      setError(result.error);
    }
  };

  // Generate timetable
  const doGenerate = async () => {
    if (!selectedStandardId || subjects.length === 0) return;
    setGenerating(true);
    setError(null);

    // Ensure settings are saved first
    const payload: TimetableSettingsPayload = currentFormSettings;
    const settResult = await saveTimetableSettings(selectedStandardId, payload);
    if (!settResult.ok) {
      setError(settResult.error);
      setGenerating(false);
      return;
    }

    // Generate using the algorithm
    const subjectsForGen: SubjectForTimetable[] = subjects.map((s) => ({
      id: s.id,
      name: s.name,
    }));
    const generated = generateTimetable(subjectsForGen, teachingPeriodCount, 5);

    // Save to DB
    const entryPayloads: TimetableEntryPayload[] = generated.map((g) => ({
      day_of_week: g.day_of_week,
      period_number: g.period_number,
      subject_id: g.subject_id,
      subject_name_override: null,
    }));
    const result = await saveTimetableEntries(selectedStandardId, entryPayloads);
    setGenerating(false);

    if (result.ok) {
      setSuccessMsg("Timetable generated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
      setConfirmRegenOpen(false);
      loadDataForStandard(selectedStandardId);
    } else {
      setError(result.error);
    }
  };

  const handleGenerate = () => {
    if (entries.length > 0) {
      setConfirmRegenOpen(true);
    } else {
      doGenerate();
    }
  };

  // Update a single cell
  const handleCellChange = async (day: number, period: number, subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    // Update locally
    const updatedEntries = entries.filter(
      (e) => !(e.day_of_week === day && e.period_number === period)
    );
    if (subjectId !== NO_SUBJECT && subject) {
      updatedEntries.push({
        id: "",
        standard_id: selectedStandardId,
        day_of_week: day,
        period_number: period,
        subject_id: subject.id,
        subject_name_override: null,
      });
    }
    setEntries(updatedEntries);
    setEditingCell(null);

    // Save all entries
    const entryPayloads: TimetableEntryPayload[] = updatedEntries.map((e) => ({
      day_of_week: e.day_of_week,
      period_number: e.period_number,
      subject_id: e.subject_id,
      subject_name_override: e.subject_name_override,
    }));
    await saveTimetableEntries(selectedStandardId, entryPayloads);
  };

  // Export PDF
  const handleExportPdf = () => {
    if (entries.length === 0) return;
    const stdName = standards.find((s) => s.id === selectedStandardId)?.name ?? "Standard";
    const pdfEntries: TimetablePdfEntry[] = entries.map((e) => {
      const subj = subjects.find((s) => s.id === e.subject_id);
      return {
        day_of_week: e.day_of_week,
        period_number: e.period_number,
        subject_name: e.subject_name_override || subj?.name || "—",
      };
    });
    exportTimetablePdf(pdfEntries, periodSlots, {
      schoolName: school.name || "School",
      standardName: stdName,
      classTeacher: classTeacher || undefined,
    }, `timetable-${stdName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`);
  };

  // Helper: get subject name for a cell
  const getSubjectForCell = (day: number, period: number): string => {
    const entry = entries.find(
      (e) => e.day_of_week === day && e.period_number === period
    );
    if (!entry) return "—";
    if (entry.subject_name_override) return entry.subject_name_override;
    const subj = subjects.find((s) => s.id === entry.subject_id);
    return subj?.name ?? "—";
  };

  const getSubjectIdForCell = (day: number, period: number): string => {
    const entry = entries.find(
      (e) => e.day_of_week === day && e.period_number === period
    );
    return entry?.subject_id ?? NO_SUBJECT;
  };

  const selectedStandard = standards.find((s) => s.id === selectedStandardId);

  return (
    <div className="space-y-4">
      {/* Standard selector + actions bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[200px]">
              <Label>Standard / Class</Label>
              <Select
                value={selectedStandardId}
                onValueChange={setSelectedStandardId}
              >
                <SelectTrigger id="timetable-standard-select">
                  <SelectValue placeholder="Select standard" />
                </SelectTrigger>
                <SelectContent>
                  {standards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStandardId && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setSettingsOpen((o) => !o)}
                  id="timetable-settings-toggle"
                >
                  <Settings2 className="h-4 w-4" />
                  {settingsOpen ? "Hide Settings" : "Configure Timings"}
                  {settingsOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>

                {subjects.length > 0 && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleGenerate}
                    disabled={generating || teachingPeriodCount === 0}
                    id="timetable-generate-btn"
                  >
                    {generating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    {generating ? "Generating…" : entries.length > 0 ? "Regenerate" : "Generate Time Table"}
                  </Button>
                )}

                {entries.length > 0 && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleExportPdf}
                    id="timetable-export-pdf"
                  >
                    <PdfIcon className="h-4 w-4" />
                    Export PDF
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Error / Success messages */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md mt-3">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-green-700 bg-green-50 p-2 rounded-md mt-3">
              {successMsg}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settings panel (collapsible) */}
      {selectedStandardId && settingsOpen && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Timing Configuration — {selectedStandard?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>School Start Time</Label>
                <Input
                  id="timetable-start-time"
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>School End Time</Label>
                <Input
                  id="timetable-end-time"
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Period Duration (min)</Label>
                <Input
                  id="timetable-period-duration"
                  type="number"
                  min={15}
                  max={60}
                  value={formPeriodDuration}
                  onChange={(e) => setFormPeriodDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Breaks</Label>
                <Select value={formNumBreaks} onValueChange={setFormNumBreaks}>
                  <SelectTrigger id="timetable-num-breaks">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Break</SelectItem>
                    <SelectItem value="2">2 Breaks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Break 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periods before Break 1</Label>
                <Input
                  id="timetable-periods-before-break1"
                  type="number"
                  min={1}
                  max={10}
                  value={formPeriodsBeforeBreak1}
                  onChange={(e) => setFormPeriodsBeforeBreak1(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Break 1 Duration (min)</Label>
                <Input
                  id="timetable-break1-duration"
                  type="number"
                  min={5}
                  max={60}
                  value={formBreak1Duration}
                  onChange={(e) => setFormBreak1Duration(e.target.value)}
                />
              </div>
            </div>

            {/* Break 2 (conditional) */}
            {parseInt(formNumBreaks) >= 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Periods between Break 1 & Break 2</Label>
                  <Input
                    id="timetable-periods-before-break2"
                    type="number"
                    min={1}
                    max={10}
                    value={formPeriodsBeforeBreak2}
                    onChange={(e) => setFormPeriodsBeforeBreak2(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Break 2 Duration (min)</Label>
                  <Input
                    id="timetable-break2-duration"
                    type="number"
                    min={5}
                    max={60}
                    value={formBreak2Duration}
                    onChange={(e) => setFormBreak2Duration(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Class Teacher (for PDF header) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Teacher (for PDF export)</Label>
                <Input
                  id="timetable-class-teacher"
                  value={classTeacher}
                  onChange={(e) => setClassTeacher(e.target.value)}
                  placeholder="e.g. Trupti .S"
                />
              </div>
            </div>

            {/* Preview info */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{teachingPeriodCount}</strong> teaching periods per day
              </span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">{subjects.length}</strong> subjects assigned
              </span>
              {teachingPeriodCount > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTimeDisplay(formStartTime)} – {formatTimeDisplay(formEndTime)}
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveSettings}
                disabled={saving}
                id="timetable-save-settings"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No subjects warning */}
      {selectedStandardId && subjects.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No subjects assigned to {selectedStandard?.name}. Go to the{" "}
              <strong>Subjects</strong> tab to add subjects first.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No standard selected */}
      {!selectedStandardId && standards.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a standard above to view or generate its timetable.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timetable Grid */}
      {selectedStandardId && entries.length > 0 && periodSlots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Weekly Time Table — {selectedStandard?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 overflow-x-auto">
            <div className="rounded-md border min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-center w-16 sticky left-0 bg-background z-10">
                      Day
                    </TableHead>
                    {periodSlots.map((slot, idx) => (
                      <TableHead
                        key={idx}
                        className={`text-center text-xs whitespace-nowrap ${
                          slot.type === "break"
                            ? "bg-muted/80 text-muted-foreground w-14 px-1"
                            : "min-w-[80px]"
                        }`}
                      >
                        {slot.type === "period" ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold">P{slot.periodNumber}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">
                              {formatTimeDisplay(slot.start)}
                              <br />
                              to
                              <br />
                              {formatTimeDisplay(slot.end)}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[10px]">Break</div>
                            <div className="text-[9px] text-muted-foreground leading-tight">
                              {formatTimeDisplay(slot.start)}
                              <br />
                              to
                              <br />
                              {formatTimeDisplay(slot.end)}
                            </div>
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((day) => (
                    <TableRow key={day}>
                      <TableCell className="font-semibold text-center sticky left-0 bg-background z-10">
                        {DAY_LABELS[day - 1]}
                      </TableCell>
                      {periodSlots.map((slot, idx) => {
                        if (slot.type === "break") {
                          return (
                            <TableCell
                              key={idx}
                              className="bg-muted/50 text-center text-[10px] text-muted-foreground"
                            />
                          );
                        }
                        const periodNum = slot.periodNumber!;
                        const isEditing =
                          editingCell?.day === day && editingCell?.period === periodNum;
                        const subjectName = getSubjectForCell(day, periodNum);

                        if (isEditing) {
                          return (
                            <TableCell key={idx} className="p-1">
                              <Select
                                value={getSubjectIdForCell(day, periodNum)}
                                onValueChange={(val) => handleCellChange(day, periodNum, val)}
                              >
                                <SelectTrigger className="h-7 text-xs min-w-[80px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_SUBJECT}>— Empty —</SelectItem>
                                  {subjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={idx}
                            className="text-center text-sm cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => setEditingCell({ day, period: periodNum })}
                            title="Click to change subject"
                          >
                            {subjectName}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-4 sm:px-0">
              💡 Click on any cell to change the subject.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state after settings saved but no entries */}
      {selectedStandardId && settings && entries.length === 0 && subjects.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Wand2 className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No timetable generated yet. Click <strong>&quot;Generate Time Table&quot;</strong> to auto-create one.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Regenerate confirmation dialog */}
      <Dialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Time Table?</DialogTitle>
            <DialogDescription>
              This will replace the existing timetable for{" "}
              <strong>{selectedStandard?.name}</strong> with a newly generated one.
              Any manual changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRegenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doGenerate} disabled={generating}>
              {generating ? "Generating…" : "Yes, Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
