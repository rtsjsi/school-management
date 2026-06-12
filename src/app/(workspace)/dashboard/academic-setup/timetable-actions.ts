"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser, isAdminOrAbove } from "@/lib/auth";

export type TimetableActionResult = { ok: true } | { ok: false; error: string };

export type TimetableSettingsPayload = {
  school_start_time: string;
  school_end_time: string;
  period_duration_minutes: number;
  num_breaks: number;
  periods_before_break_1: number;
  break_1_duration_minutes: number;
  periods_before_break_2: number | null;
  break_2_duration_minutes: number | null;
};

export async function saveTimetableSettings(
  standardId: string,
  settings: TimetableSettingsPayload
): Promise<TimetableActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();

  // Upsert by standard_id
  const { error } = await supabase
    .from("timetable_settings")
    .upsert(
      {
        standard_id: standardId,
        school_start_time: settings.school_start_time,
        school_end_time: settings.school_end_time,
        period_duration_minutes: settings.period_duration_minutes,
        num_breaks: settings.num_breaks,
        periods_before_break_1: settings.periods_before_break_1,
        break_1_duration_minutes: settings.break_1_duration_minutes,
        periods_before_break_2: settings.periods_before_break_2,
        break_2_duration_minutes: settings.break_2_duration_minutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "standard_id" }
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type TimetableEntryPayload = {
  day_of_week: number;
  period_number: number;
  subject_id: string | null;
  subject_name_override: string | null;
};

export async function saveTimetableEntries(
  standardId: string,
  entries: TimetableEntryPayload[]
): Promise<TimetableActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();

  // Delete existing entries for the standard, then insert new ones
  const { error: delErr } = await supabase
    .from("timetable_entries")
    .delete()
    .eq("standard_id", standardId);

  if (delErr) return { ok: false, error: delErr.message };

  if (entries.length === 0) return { ok: true };

  const rows = entries.map((e) => ({
    standard_id: standardId,
    day_of_week: e.day_of_week,
    period_number: e.period_number,
    subject_id: e.subject_id,
    subject_name_override: e.subject_name_override,
  }));

  const { error: insErr } = await supabase
    .from("timetable_entries")
    .insert(rows);

  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true };
}

export async function deleteTimetable(
  standardId: string
): Promise<TimetableActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();

  const { error } = await supabase
    .from("timetable_entries")
    .delete()
    .eq("standard_id", standardId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
