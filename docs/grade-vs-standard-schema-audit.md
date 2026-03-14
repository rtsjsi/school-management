# Grade vs standard – schema audit (table scripts)

This document lists every migration that uses the keyword **grade** and whether it is correct (exam grade A/B/C) or refers to class/level (standard).  
**Reference:** all occurrences below include `supabase/migrations/<file>:<line>`.

---

## Correct use of "grade" (exam grade or evaluation type)

| File:line | Usage | Verdict |
|-----------|--------|--------|
| `20240219070000_subject_master_per_class.sql:1` | Comment: "grade vs mark based" | ✅ |
| `20240219070000_subject_master_per_class.sql:5` | `evaluation_type IN ('grade', 'mark')` | ✅ Exam evaluation type |
| `20240219070000_subject_master_per_class.sql:47-48` | Add `exam_result_subjects.grade` column | ✅ Stores A/B/C exam grade |
| `20240219070000_subject_master_per_class.sql:50` | Comment on `evaluation_type`: "grade = enter grade (A/B/C)" | ✅ |
| `20240219070000_subject_master_per_class.sql:52` | Comment on `exam_result_subjects.grade`: "Grade for grade-based subjects (e.g. A, B, C)" | ✅ |

---

## Class/level stored under name "grade" (ambiguous in schema)

| File:line | Usage | Notes |
|-----------|--------|--------|
| `20240213100000_create_students_and_employees.sql:7` | `grade TEXT` on `students` | Column = current class/level name. Clarified by `20260314000000` COMMENT. |
| `20240213200000_create_fees_exams_expenses.sql:40` | `grade TEXT` on `exams` | **Fixed:** renamed to `standard` in `20260218120000`. |
| `20240213300000_add_performance_indexes.sql:11` | `CREATE INDEX idx_students_grade ON students(grade)` | Index on class/level column. |
| `20240213300000_add_performance_indexes.sql:31` | Comment on index: "filtering students by grade" | Means "by class/level". |
| `20240220100000_unified_naming_principal_standard_division.sql:72` | `UPDATE students SET ... grade = g_name` | Trigger: denormalized standard name. |
| `20240220100000_unified_naming_principal_standard_division.sql:87` | `grade = g.name` in one-time sync | Same. |
| `20240219280000_students_derived_sync.sql:16` | `grade = g_name` in trigger | Syncs standard name to `students.grade`. |
| `20240219280000_students_derived_sync.sql:32` | `grade = g.name` in sync | Same. |
| `20250618470000_academic_year_status_column.sql:58` | `grade = g_name` in trigger | Same. |

---

## Historical migrations (grades table → standards)

These use the old **grades** table / **grade_id**; `20240220100000` renames to **standards** / **standard_id**. No change (history only).

| File:line | Usage |
|-----------|--------|
| `20240219250000_grades_table.sql:1-2,10-11,13-16,18,20-21` | Create `grades` table, indexes, policies, comment, backfill. |
| `20240219260000_divisions_table.sql:2,6,9,12,20,22-23,26` | `grade_id` on divisions, `idx_divisions_grade`, comment, backfill from `grades`. |
| `20240219270000_student_enrollments.sql:1,6,30-31,35-37` | `grade_id` on enrollments; backfill from `students.grade` / `grades`. |
| `20240220100000_unified_naming_principal_standard_division.sql:1,19-26,34-36,41,43-45` | Rename `grades` → `standards`, `grade_id` → `standard_id`, policies, indexes. |
| `20240219280000_students_derived_sync.sql:12,25,37` | Trigger uses `grade_id`; later migration renames to `standard_id`. |

---

## Fee structures (grade range → standard_id)

| File:line | Usage | Notes |
|-----------|--------|--------|
| `20240213500000_fees_module_expansion.sql:1,5-6,76` | `grade_from`, `grade_to`, comment "grade range" | **Fixed:** `20260218132000` drops these, uses `standard_id`. |
| `20260218132000_fee_structures_standard_id.sql:2,7,11,18,21-22` | Backfill from `grade_from`, then DROP `grade_from`/`grade_to`. | Legacy columns removed. |

---

## Documentation migration (students.grade)

| File:line | Usage |
|-----------|--------|
| `20260314000000_comment_students_grade_column.sql:1,3` | COMMENT on `students.grade`: "Current standard (class level) name ... Not exam grade (A/B/C)." |

---

## Other references (comments / renames only)

| File:line | Usage |
|-----------|--------|
| `20240213800000_classes_and_exam_marks.sql:17` | Comment: "students.grade already exists" (class name). |
| `20240219070000_subject_master_per_class.sql:21,26,32,37` | Comments / JOINs: "student grade -> class", `st.grade` (students class name). |
| `20260218120000_rename_exam_grade_to_standard_and_drop_subject.sql:1,4` | Rename `exams.grade` → `exams.standard`. |

---

## Summary

- **Exam grade (correct):** `exam_result_subjects.grade`, `subjects.evaluation_type` value `'grade'`, and their comments.
- **Class/level in DB:** only **`students.grade`** (and index `idx_students_grade`). Documented by migration `20260314000000_comment_students_grade_column.sql`.
- **Already fixed in schema:** `exams.grade` → `exams.standard`; fee_structures `grade_from`/`grade_to` → `standard_id`; table `grades` → `standards`; columns `grade_id` → `standard_id`.
