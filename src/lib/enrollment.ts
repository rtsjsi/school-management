import { createClient } from "@/lib/supabase/server";

export type CurrentEnrollment = {
  id: string;
  standardId: string;
  standardName: string;
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
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getActiveAcademicYearName(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("name")
    .eq("status", "active")
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
    .select("id, standard_id, division_id, academic_year_id")
    .eq("student_id", studentId)
    .eq("academic_year_id", ayId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const [g, d, ay] = await Promise.all([
    supabase.from("standards").select("name").eq("id", data.standard_id).maybeSingle(),
    supabase.from("standard_divisions").select("name").eq("id", data.division_id).maybeSingle(),
    supabase.from("academic_years").select("name").eq("id", data.academic_year_id).maybeSingle(),
  ]);
  return {
    id: data.id,
    standardId: data.standard_id,
    standardName: (g.data?.name as string) ?? "",
    divisionId: data.division_id,
    divisionName: (d.data?.name as string) ?? "",
    academicYearId: data.academic_year_id,
    academicYearName: (ay.data?.name as string) ?? "",
  };
}

export async function getNextStandardId(currentStandardId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: current } = await supabase.from("standards").select("sort_order").eq("id", currentStandardId).maybeSingle();
  if (!current) return null;
  const { data: next } = await supabase
    .from("standards")
    .select("id")
    .eq("sort_order", current.sort_order + 1)
    .limit(1)
    .maybeSingle();
  return next?.id ?? null;
}

export async function isHighestStandard(standardId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: maxRow } = await supabase.from("standards").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: standardRow } = await supabase.from("standards").select("sort_order").eq("id", standardId).maybeSingle();
  if (!maxRow || !standardRow) return false;
  return standardRow.sort_order >= maxRow.sort_order;
}
