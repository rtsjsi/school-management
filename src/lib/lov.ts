import { createClient } from "@/lib/supabase/client";

export type ClassOption = { id: string; name: string };
export type DivisionOption = { id: string; name: string };
export type AcademicYearOption = { id: string; name: string };
export type GradeOption = { id: string; name: string };

export async function fetchClasses(): Promise<ClassOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("classes")
    .select("id, name")
    .order("sort_order");
  return (data ?? []) as ClassOption[];
}

export async function fetchGrades(): Promise<GradeOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("grades")
    .select("id, name")
    .order("sort_order");
  return (data ?? []) as GradeOption[];
}

export async function fetchDivisionsByGradeId(gradeId: string): Promise<DivisionOption[]> {
  if (!gradeId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("divisions")
    .select("id, name")
    .eq("grade_id", gradeId)
    .order("sort_order");
  return (data ?? []) as DivisionOption[];
}

export async function fetchDivisionsByClassId(classId: string): Promise<DivisionOption[]> {
  if (!classId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("class_divisions")
    .select("id, name")
    .eq("class_id", classId)
    .order("sort_order");
  return (data ?? []) as DivisionOption[];
}

export async function fetchDivisionsByGrade(grade: string): Promise<DivisionOption[]> {
  if (!grade.trim()) return [];
  const supabase = createClient();
  const { data: classRow } = await supabase
    .from("classes")
    .select("id")
    .eq("name", grade.trim())
    .maybeSingle();
  if (!classRow) return [];
  return fetchDivisionsByClassId(classRow.id);
}

export async function fetchAllDivisions(): Promise<DivisionOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("class_divisions")
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
    .select("id, name")
    .order("sort_order");
  return (data ?? []) as AcademicYearOption[];
}
