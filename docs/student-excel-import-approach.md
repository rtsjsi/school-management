# Student import from Excel / CSV (table) – finalized approach

This doc defines how to import student data from Excel or a **direct table (CSV)** into `students` and `student_enrollments` without struggling with ID resolution. Using **CSV with the same column headers as your class list** is the quickest: no Excel needed, just save-as CSV or paste into a `.csv` file.

---

## The ID problem

Excel (and any CSV/Excel source) only has **names**:

- Academic year: e.g. `"2025-2026"`
- Standard (class): e.g. `"Nursery"`, `"Junior KG (LKG)"`, `"I"`, `"II"`
- Division: e.g. `"A"`, `"B"`

The database needs **UUIDs**:

- `student_enrollments.academic_year_id` → `academic_years.id`
- `student_enrollments.standard_id` → `standards.id`
- `student_enrollments.division_id` → `standard_divisions.id`

Division is **per-standard**: division "A" for "Nursery" is a different row (and ID) than division "A" for "I". So we must resolve **(standard name, division name)** → `standard_divisions.id`.

---

## Recommended approach: script + live DB

Use a **single script** that:

1. **Connects** to Supabase (e.g. branch-based env: `.env.main` / `.env.development` + `.env.local`).
2. **Loads reference data once** before any inserts:
   - `academic_years`: `id`, `name` (and optionally `status` if you want only active).
   - `standards`: `id`, `name`.
   - `standard_divisions`: `id`, `standard_id`, `name`.
3. **Builds in-memory maps** (no DB calls per row):
   - `academicYearByName`: `name` → `id`
   - `standardByName`: `name` → `id`
   - `divisionByStandardAndName`: key `"<standard_id>:<division_name>"` → `division_id`  
     (or key `"<standard_name>:<division_name>"` if you prefer; then resolve standard_id from `standardByName` first.)
4. **Parses Excel**: for each row, get `(academic_year_name, standard_name, division_name)` (plus student fields).
5. **Resolves IDs** using the maps:
   - `academic_year_id = academicYearByName.get(academic_year_name)`
   - `standard_id = standardByName.get(standard_name)`
   - `division_id = divisionByStandardAndName.get(standard_id, division_name)` or equivalent.
6. **On missing resolution**: skip that row and record a **clear error** (e.g. `"Standard 'Nursery' not found"`, `"Division 'B' not found for standard 'I'"`). Do not insert with NULL IDs.
7. **Inserts**:
   - One row into `students` (all non-enrollment fields; use standard/division **names** in `students.standard` and `students.division` for display; the trigger will overwrite from enrollment if you insert enrollment next).
   - One row into `student_enrollments` with `(student_id, academic_year_id, standard_id, division_id, status)` using the **resolved UUIDs**.

This way you never “struggle” with IDs: everything is resolved in one place via the pre-loaded maps, and missing data is reported explicitly.

---

## Prerequisites (before running import)

1. **Standards** must exist (e.g. run `supabase/manual/insert_standards_prod.sql` or ensure `standards` is populated).
2. **Standard divisions** must exist for each (standard, division) you use in Excel (e.g. run `supabase/manual/insert_standard_divisions_prod.sql` or equivalent).
3. **Academic years** must exist; at least one row with the name you use in Excel (e.g. `"2025-2026"`). For “current” year you can use the row with `status = 'active'`.

If any of these are missing, the script should fail fast with a clear message (e.g. “No academic year found for '2025-2026'” or “Standard 'Nursery' not in database”).

---

## Standard name mapping (Excel → DB)

Excel may use different names than the DB. Map in the script (or a small config) so that after mapping we only use **DB** names for lookups:

| Excel / source   | DB (canonical)     |
|------------------|--------------------|
| NUR, Nursery     | Nursery            |
| JR.KG., LKG      | Junior KG (LKG)    |
| SR.KG., UKG      | Senior KG (UKG)    |
| 1, 2, … 12       | I, II, … XII (or 1, 2, … 12 if your DB uses numbers) |

Use the **exact** `standards.name` and `standard_divisions.name` values as in the DB when building the maps and when resolving.

---

## Alternative: generate SQL only (no DB connection)

If you prefer to **generate a `.sql` file** and run it later (e.g. in Supabase SQL editor):

- Resolve IDs in the SQL using **subqueries** so the IDs are computed when the script runs:
  - `academic_year_id`: `(SELECT id FROM academic_years WHERE name = '2025-2026' LIMIT 1)`
  - `standard_id`: `(SELECT id FROM standards WHERE name = 'Nursery' LIMIT 1)`
  - `division_id`: `(SELECT sd.id FROM standard_divisions sd JOIN standards s ON s.id = sd.standard_id WHERE s.name = 'Nursery' AND sd.name = 'A' LIMIT 1)`
- **Downside**: If a name is wrong or missing, the subquery returns NULL and the INSERT fails with a FK violation; errors are less clear than in the script approach.
- **Prerequisite**: Whoever runs the SQL must have already loaded `academic_years`, `standards`, and `standard_divisions`.

---

## Summary

- **Finalized approach**: One script, one DB connection, load `academic_years` / `standards` / `standard_divisions` once, build name→id maps, resolve every row with those maps, insert into `students` then `student_enrollments` with resolved UUIDs. Report clear errors for missing standard/division/academic year.
- **No ID struggle**: All ID resolution is done via the pre-built maps; no per-row DB lookups and no guessing.
- **Prerequisites**: Standards, standard_divisions, and academic_years must exist before import; document this and enforce in the script with clear messages.

When you implement the new import, follow this doc so the flow stays consistent and maintainable.

---

## CSV / direct table import (quickest)

Use a **CSV file** with the same column headers as your class list table:

**Required columns:** `RollNo`, `Gr_no`, `Name`  
**Optional (mapped):** `Gender`, `MotherName`, `Birthdate`, `AdharCard`, `Address`, `PhMob`, `Category`, `Religion`, `FatherName`, `BldGroup`

- **Birthdate:** `DD.MM.YYYY` (e.g. `11.1.2022`) → stored as `YYYY-MM-DD`
- **Category:** `S.T.` → `st`, `O.B.C.` → `obc`, `S.C.` → `sc`, `GENERAL` → `general`
- **Gender:** `M` → `male`, `F` → `female`
- **AdharCard:** leading `*` is stripped; only digits kept
- **PhMob:** if two numbers separated by `/`, the first is used

One CSV = one class. Pass standard and division on the command line.

```bash
# 1. Ensure maps are OK
npm run student-import-maps

# 2. Import (use exact standard name from maps: Nursery, Junior KG (LKG), I, II, …)
npx tsx scripts/import-students-from-csv.ts nursery-a.csv --standard Nursery --division A

# Optional: specific academic year (default: active year)
npx tsx scripts/import-students-from-csv.ts nursery-a.csv --standard Nursery --division A --academic-year 2025-2026

# Dry run (no DB writes)
npx tsx scripts/import-students-from-csv.ts nursery-a.csv --standard Nursery --division A --dry-run
```
