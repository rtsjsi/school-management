import type { SupabaseClient } from "@supabase/supabase-js";

type EmployeeRow = {
  id: string;
  joining_date: string | null;
  created_at: string | null;
  full_name: string | null;
};

/** Reassign employee_id values to 1, 2, 3… ordered by joining date (earliest first). */
export async function reassignEmployeeIds(
  supabase: SupabaseClient,
): Promise<{ error?: string }> {
  const { data: employees, error: fetchError } = await supabase
    .from("employees")
    .select("id, joining_date, created_at, full_name");

  if (fetchError) return { error: fetchError.message };
  if (!employees?.length) return {};

  const sorted = [...employees].sort((a: EmployeeRow, b: EmployeeRow) => {
    const da = a.joining_date ?? "9999-12-31";
    const db = b.joining_date ?? "9999-12-31";
    if (da !== db) return da.localeCompare(db);
    const ca = a.created_at ?? "";
    const cb = b.created_at ?? "";
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.full_name ?? "").localeCompare(b.full_name ?? "");
  });

  // Use temporary IDs first to avoid unique-constraint collisions during reassignment.
  for (const emp of sorted) {
    const { error } = await supabase
      .from("employees")
      .update({ employee_id: `TMP-${emp.id}` })
      .eq("id", emp.id);
    if (error) return { error: error.message };
  }

  for (let i = 0; i < sorted.length; i++) {
    const { error } = await supabase
      .from("employees")
      .update({ employee_id: String(i + 1) })
      .eq("id", sorted[i].id);
    if (error) return { error: error.message };
  }

  return {};
}
