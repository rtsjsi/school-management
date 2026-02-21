import { createClient } from "@/lib/supabase/server";

export type CurrentEnrollment = {
  id: string;
  gradeId: string;
  gradeName: string;
  divisionId: string;
  divisionName: string;
  academicYearId: string;
  academicYearName: string;
};

export async function getActiveAcademicYearId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getActiveAcademicYearName(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data?.name ?? null;
}

export async function getCurrentEnrollment(studentId: string): Promise<CurrentEnrollment | null> {
  const supabase = await createClient();
  const ayId = await getActiveAcademicYearId();
  if (!ayId) return null;
  const { data } = await supabase
    .from("student_enrollments")
    .select("id, grade_id, division_id, academic_year_id")
    .eq("student_id", studentId)
    .eq("academic_year_id", ayId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const [g, d, ay] = await Promise.all([
    supabase.from("grades").select("name").eq("id", data.grade_id).maybeSingle(),
    supabase.from("divisions").select("name").eq("id", data.division_id).maybeSingle(),
    supabase.from("academic_years").select("name").eq("id", data.academic_year_id).maybeSingle(),
  ]);
  return {
    id: data.id,
    gradeId: data.grade_id,
    gradeName: (g.data?.name as string) ?? "",
    divisionId: data.division_id,
    divisionName: (d.data?.name as string) ?? "",
    academicYearId: data.academic_year_id,
    academicYearName: (ay.data?.name as string) ?? "",
  };
}

export async function getNextGradeId(currentGradeId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: current } = await supabase.from("grades").select("sort_order").eq("id", currentGradeId).maybeSingle();
  if (!current) return null;
  const { data: next } = await supabase
    .from("grades")
    .select("id")
    .eq("sort_order", current.sort_order + 1)
    .limit(1)
    .maybeSingle();
  return next?.id ?? null;
}

export async function isHighestGrade(gradeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: maxRow } = await supabase.from("grades").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: grade } = await supabase.from("grades").select("sort_order").eq("id", gradeId).maybeSingle();
  if (!maxRow || !grade) return false;
  return grade.sort_order >= maxRow.sort_order;
}
