# Clone Prod to Dev (Full Database + Storage)

Single command to fully clone the production Supabase database and storage into the development environment.

## What it does

1. **Exports** all data from prod (auth users, all public tables, storage bucket files) to `Clone/<timestamp>/`.
2. **Flushes** all dev data (auth users, public tables).
3. **Imports** everything into dev with all IDs preserved.
4. Sets a default password (`Angel@123`) for all dev users.

Each run creates a new timestamped folder under `Clone/`, so you always have historical backups.

## Tables cloned

**Auth:** `auth.users`

**Public (29 tables):**
`academic_years`, `employees`, `employee_attendance_approvals`, `employee_attendance_daily`,
`employee_attendance_punches`, `employee_salaries`, `exam_result_subjects`, `exam_subjects`,
`exams`, `expense_budgets`, `expense_heads`, `expenses`, `fee_collections`, `fee_structure_items`,
`fee_structures`, `holidays`, `profile_allowed_classes`, `profiles`, `salary_allowance_items`,
`salary_deduction_items`, `school_settings`, `shifts`, `standard_divisions`, `standards`,
`student_documents`, `student_enrollments`, `student_photos`, `students`, `subjects`

**Storage:** All buckets and files.

## Prerequisites

- `.env.main` with prod `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `.env.development` with dev `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_PROJECT_REF`
- Dev database password set as an environment variable

## Run

Set the dev DB password in your shell, then run:

```powershell
$env:SUPABASE_DB_PASSWORD_DEVELOPMENT = "<your-dev-db-password>"
npm run clone:prod-to-dev
```

## Output

- Console shows progress for each step.
- `Clone/<timestamp>/_clone-result.json` contains the final import summary.
- Each run creates a new `Clone/<timestamp>/` folder with the full exported data as a backup.

Example folder structure:
```
Clone/
  2026-03-31_14-30-00/
    auth.users.json
    public.profiles.json
    ...
    storage/
    _clone-result.json
  2026-04-01_09-00-00/
    ...
```

## Safety notes

- The script flushes **all** dev data before importing. Take a backup if needed.
- Never point prod env vars at the dev database or vice-versa.
- Passwords are NOT cloned from prod — all dev users get `Angel@123`.
