-- Insert students + enrollments for Nursery A, academic year 2025-2026.
-- Generated from NURSERY-A-Student-List.xlsx. Run after standards + standard_divisions + academic_years are loaded.
-- Usage: node scripts/by-branch.js db query --linked -f supabase/manual/insert_students_nursery_a_2025_2026.sql -o table

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775636-768', 'Aniruddh Dharmeshkumar Mehta', '2022-01-11', 'male', NULL, 'general', NULL, NULL, '59,60 Sanskruti Soc, Vyara', NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, NULL, '135', '9737722345', '9737722345', NULL, '2025-2026', 1, 'Nursery', 'A', 'active', NULL, 'Dharmeshkumar', 'Jinal', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775636-194', 'Chaudhari Kabir Swapanilkumar', '2021-11-23', 'male', 'A+', 's.t.', 'Hindu', NULL, 'B/52 Rajnagar Soc., College Rd., Vyara', NULL, NULL, NULL, NULL, 'India', '765998557542', NULL, NULL, NULL, '134', '8155881433', '8155881433', NULL, '2025-2026', 2, 'Nursery', 'A', 'active', NULL, 'Swapanilkumar', 'Komalkumari', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775636-878', 'Chaudhari Prishiv Tejaskumar', '2021-06-20', 'male', 'B+', 'o.b.c.', 'Hindu', NULL, '78- Vrundavandham Soc., Kanpura, Vyara', NULL, NULL, NULL, NULL, 'India', '386757254658', NULL, NULL, NULL, '138', '9537505004', '9537505004', NULL, '2025-2026', 3, 'Nursery', 'A', 'active', NULL, 'Tejaskumar', 'Bhaviniben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775636-583', 'Gamit Adriel Chandrashekhar', '2021-07-07', 'male', 'A+', 's.t.', 'Hindu', NULL, '214- Shivsakti park soc., B/H Chaudhari Samajwadi, Musa Rd., Vyara', NULL, NULL, NULL, NULL, 'India', '827027262409', NULL, NULL, NULL, '143', '9925803121', '9925803121', NULL, '2025-2026', 4, 'Nursery', 'A', 'active', NULL, 'Chandrashekhar', 'Smitaben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775636-876', 'Gamit Isaac Viren', '2022-01-25', 'male', 'A+', 's.t.', 'Hindu', NULL, '139- Uplu Faliyu, Champawadi, Vyara', NULL, NULL, NULL, NULL, 'India', '802616453238', NULL, NULL, NULL, '131', '9586888009', '9586888009', NULL, '2025-2026', 5, 'Nursery', 'A', 'active', NULL, 'Viren', 'Purvikumari', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775636-170', 'Jiyan Nikunjkumar Sajotiya', '2021-09-17', 'male', 'O+', 's.c.', 'Hindu', NULL, 'A/103, Krishna Resi., Mandvi Surat', NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, NULL, '136', '9712322572', '9712322572', NULL, '2025-2026', 6, 'Nursery', 'A', 'active', NULL, 'Nikunjkumar', 'Divya', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-124', 'Rudra Sandipkumar Chaudhari', '2021-08-15', 'male', 'B+', 's.t.', 'Hindu', NULL, '20/ D.K Park, Vyara', NULL, NULL, NULL, NULL, 'India', '799083991173', NULL, NULL, NULL, '130', '8799460828', '8799460828', NULL, '2025-2026', 7, 'Nursery', 'A', 'active', NULL, 'Sandipkumar', 'Pinkalkumari', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-8', 'Shivam Choudhary', '2021-08-19', 'male', NULL, 'general', NULL, NULL, 'Shradhdha Novelty, Main Bazar, Vyara', NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, NULL, '133', '9737860699', '9737860699', NULL, '2025-2026', 8, 'Nursery', 'A', 'active', NULL, 'Prakash', 'Kanku', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-83', 'Shrey Tejas Prajapati', '2021-10-16', 'male', 'O+', 'o.b.c.', 'Hindu', NULL, 'Kumbharwad, B/H Ramji Temple, Vyara', NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, NULL, '137', '9033326732', '9033326732', NULL, '2025-2026', 9, 'Nursery', 'A', 'active', NULL, 'Tejas', 'Priyanka', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-877', 'Steve Vishalbhai Vasava', '2022-01-22', 'male', 'A+', 's.t.', 'Christian', NULL, 'A/9 Flower valley soc., Vyara', NULL, NULL, NULL, NULL, 'India', '930393425972', NULL, NULL, NULL, '132', '9033121542', '9033121542', NULL, '2025-2026', 10, 'Nursery', 'A', 'active', NULL, 'Vishalbhai', 'Snehaben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-287', 'Ayesha Uzer Ansari', '2021-12-21', 'female', 'A-', 'o.b.c.', 'Muslim', NULL, '5 star bakery, Maliwad, Vyara', NULL, NULL, NULL, NULL, 'India', '265502499367', NULL, NULL, NULL, '128', '9510746152', '9510746152', NULL, '2025-2026', 11, 'Nursery', 'A', 'active', NULL, 'Mohammad Uzer Shamim', 'Iramnoor Uzer Ansari', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-231', 'Dhriva Paulchandra Gamit', '2021-07-22', 'female', 'AB+', 's.t.', 'Hindu', NULL, 'Saraiya, Vyara', NULL, NULL, NULL, NULL, 'India', '539269641938', NULL, NULL, NULL, '142', '9687149049', '9687149049', NULL, '2025-2026', 12, 'Nursery', 'A', 'active', NULL, 'Paulchandra', 'Priyankaben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-325', 'Hriti Kuldip Bhavsar', '2021-10-29', 'female', 'O+', 'general', 'Hindu', NULL, '401- Shubham Labham Heights, Kachvala Street, Vyara', NULL, NULL, NULL, NULL, 'India', '927128029832', NULL, NULL, NULL, '139', '9725606070', '9725606070', NULL, '2025-2026', 13, 'Nursery', 'A', 'active', NULL, 'Kuldip', 'Shivaniben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-909', 'Neeva Darshitkumar Vora', '2022-03-24', 'female', 'B+', 'general', 'Hindu', NULL, '22, Sarthi Resi., Vyara', NULL, NULL, NULL, NULL, 'India', '224828127979', NULL, NULL, NULL, '129', '6355902697', '6355902697', NULL, '2025-2026', 14, 'Nursery', 'A', 'active', NULL, 'Darshitkumar Vora', 'Ashaben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-260', 'Pranshi Vishal Chaudhari', '2021-11-02', 'female', 'A+', 's.t.', 'Hindu', NULL, 'D/4  Shradhdha Resi., Vyara', NULL, NULL, NULL, NULL, 'India', '820852398494', NULL, NULL, NULL, '140', '9099989918', '9099989918', NULL, '2025-2026', 15, 'Nursery', 'A', 'active', NULL, 'Vishal', 'Sonal', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-334', 'Shipra Rahul Vadile', '2022-01-07', 'female', 'B+', 'o.b.c.', 'Hindu', NULL, '404- Sarvoday Apprt. Vyara', NULL, NULL, NULL, NULL, 'India', '748284470700', NULL, NULL, NULL, '141', '8141666143', '8141666143', NULL, '2025-2026', 16, 'Nursery', 'A', 'active', NULL, 'Rahul', 'Fardinbanu', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;

WITH s AS (
  INSERT INTO public.students (student_id, full_name, date_of_birth, gender, blood_group, category, religion, caste, present_address_line1, present_city, present_district, present_state, present_pincode, present_country, aadhar_no, pen_no, apaar_id, udise_id, gr_number, whatsapp_no, parent_contact, mother_contact, academic_year, roll_number, standard, division, status, admission_date, father_name, mother_name, fee_concession_amount, fee_concession_reason)
  VALUES ('STU-2026-1773848775637-554', 'Arav Jhunnu kumar Paswan', '2021-10-23', 'male', 'AB+', 'st', 'Hindu', NULL, '09- Aadarsh nagar, Nani Chikhli', NULL, NULL, NULL, NULL, 'India', NULL, NULL, NULL, NULL, '144', '7435030933 / 9879805750', '7435030933 / 9879805750', NULL, '2025-2026', 17, 'Nursery', 'A', 'active', NULL, 'Jhunnu kumar', 'Lataben', NULL, NULL)
  RETURNING id
)
INSERT INTO public.student_enrollments (student_id, academic_year_id, standard_id, division_id, status)
SELECT id, (SELECT id FROM public.academic_years WHERE name = '2025-2026' LIMIT 1), (SELECT id FROM public.standards WHERE name = 'Nursery' LIMIT 1), (
          SELECT sd.id
          FROM public.standard_divisions sd
          JOIN public.standards st ON st.id = sd.standard_id
          WHERE st.name = 'Nursery' AND sd.name = 'A'
          LIMIT 1
        ), 'active' FROM s;
