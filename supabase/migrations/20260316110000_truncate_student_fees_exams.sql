-- Flush student, fee, exam, and attendance data (clean operational slate)
-- WARNING: This is destructive and intended for controlled data resets only.

-- 1) Exam-related data (only tables that still exist)
TRUNCATE TABLE public.exam_result_subjects RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.exam_subjects       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.exams               RESTART IDENTITY CASCADE;

-- 2) Fee-related data (fees table is already dropped in later migrations)
TRUNCATE TABLE public.fee_collections     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.fee_structure_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.fee_structures      RESTART IDENTITY CASCADE;

-- 3) Attendance data (attendance_approved was dropped after being merged)
TRUNCATE TABLE public.attendance_daily           RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.attendance_month_approvals RESTART IDENTITY CASCADE;

-- 4) Student-related data
TRUNCATE TABLE public.student_photos      RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.student_documents   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.student_enrollments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.students            RESTART IDENTITY CASCADE;
