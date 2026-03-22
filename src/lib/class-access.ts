import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/lib/auth";
import { isAdminOrAbove, isClerk, isPayrollRole } from "@/lib/auth";

export type AllowedClass = { standardId: string; divisionId: string };

export type AllowedClassesResult = {
  standardIds: string[];
  divisionIds: string[];
  pairs: AllowedClass[];
};

/** Pairs as standard/division names for filtering students table (students.standard, students.division). */
export type AllowedClassNames = { standardName: string; divisionName: string }[];

/** True if the user's data access should be restricted by allowed classes (teacher, auditor). */
export function shouldApplyClassFilter(user: AuthUser | null): boolean {
  if (!user) return false;
  if (isAdminOrAbove(user) || isClerk(user) || isPayrollRole(user)) return false;
  return true;
}

/** Get allowed (standard_id, division_id) pairs for a profile. Cached per request. */
export const getAllowedClasses = cache(async (profileId: string): Promise<AllowedClassesResult> => {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("profile_allowed_classes")
    .select("standard_id, division_id")
    .eq("profile_id", profileId);

  const pairs: AllowedClass[] = [];
  const standardIds = new Set<string>();
  const divisionIds = new Set<string>();
  for (const r of rows ?? []) {
    if (r.division_id) {
      pairs.push({ standardId: r.standard_id, divisionId: r.division_id });
      standardIds.add(r.standard_id);
      divisionIds.add(r.division_id);
    }
  }
  return {
    standardIds: Array.from(standardIds),
    divisionIds: Array.from(divisionIds),
    pairs,
  };
});

/** Get allowed classes as (standardName, divisionName) for filtering students. Cached. */
export const getAllowedClassNames = cache(async (profileId: string): Promise<AllowedClassNames | null> => {
  const allowed = await getAllowedClasses(profileId);
  if (allowed.pairs.length === 0) return null;
  const supabase = await createClient();
  const stdIds = Array.from(new Set(allowed.pairs.map((p) => p.standardId)));
  const divIds = Array.from(new Set(allowed.pairs.map((p) => p.divisionId)));
  const [stdRes, divRes] = await Promise.all([
    supabase.from("standards").select("id, name").in("id", stdIds),
    supabase.from("standard_divisions").select("id, name").in("id", divIds),
  ]);
  const stdMap = (stdRes.data ?? []).reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {} as Record<string, string>);
  const divMap = (divRes.data ?? []).reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {} as Record<string, string>);
  return allowed.pairs.map((p) => ({
    standardName: stdMap[p.standardId] ?? "",
    divisionName: divMap[p.divisionId] ?? "",
  })).filter((n) => n.standardName && n.divisionName);
});

/** Student IDs that belong to allowed classes in the active academic year. Returns null = no filter (all). Empty Set = no access. */
export const getStudentIdsForAllowedClasses = cache(async (profileId: string): Promise<Set<string> | null> => {
  const allowed = await getAllowedClasses(profileId);
  const supabase = await createClient();
  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (!activeYear?.id) return new Set();
  if (allowed.pairs.length === 0) return new Set();
  const conditions = allowed.pairs.map(
    (p) => `and(standard_id.eq.${p.standardId},division_id.eq.${p.divisionId})`
  );
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("academic_year_id", activeYear.id)
    .eq("status", "active")
    .or(conditions.join(","));
  const ids = new Set((enrollments ?? []).map((e) => e.student_id));
  return ids;
});

/** Check if (standardId, divisionId) is in the allowed list. */
export function isClassAllowed(
  allowed: AllowedClassesResult,
  standardId: string,
  divisionId: string | null
): boolean {
  if (allowed.pairs.length === 0) return false;
  if (!divisionId) return allowed.standardIds.includes(standardId);
  return allowed.pairs.some((p) => p.standardId === standardId && p.divisionId === divisionId);
}
