import { createClient } from "@/lib/supabase/client";

export type StandardOption = { id: string; name: string };
export type DivisionOption = { id: string; name: string };
export type AcademicYearOption = { id: string; name: string; status?: string | null };
export type GradeOption = { id: string; name: string };

export async function fetchStandards(): Promise<StandardOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("standards")
    .select("id, name")
    .order("sort_order");
  return (data ?? []) as StandardOption[];
}

/** @deprecated Use fetchStandards */
export const fetchClasses = fetchStandards;

export async function fetchGrades(): Promise<GradeOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("standards")
    .select("id, name")
    .order("sort_order");
  return (data ?? []) as GradeOption[];
}

export async function fetchDivisionsByStandardId(standardId: string): Promise<DivisionOption[]> {
  if (!standardId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("divisions")
    .select("id, name")
    .eq("standard_id", standardId)
    .order("sort_order");
  return (data ?? []) as DivisionOption[];
}

/** @deprecated Use fetchDivisionsByStandardId */
export const fetchDivisionsByGradeId = fetchDivisionsByStandardId;

/** @deprecated Use fetchDivisionsByStandardId with standard name lookup */
export const fetchDivisionsByClassId = fetchDivisionsByStandardId;

export async function fetchDivisionsByStandard(standardName: string): Promise<DivisionOption[]> {
  if (!standardName.trim()) return [];
  const supabase = createClient();
  const { data: standardRow } = await supabase
    .from("standards")
    .select("id")
    .eq("name", standardName.trim())
    .maybeSingle();
  if (!standardRow) return [];
  return fetchDivisionsByStandardId(standardRow.id);
}

export async function fetchAllDivisions(): Promise<DivisionOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("divisions")
    .select("id, name")
    .order("name");
  const seen = new Set<string>();
  return ((data ?? []) as DivisionOption[]).filter((d) => {
    if (seen.has(d.name)) return false;
    seen.add(d.name);
    return true;
  });
}

export async function fetchAcademicYears(): Promise<AcademicYearOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id, name, status")
    .order("sort_order");
  return (data ?? []) as AcademicYearOption[];
}
