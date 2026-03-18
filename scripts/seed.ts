/**
 * Seed script: Flush all app data and insert dummy data in all active/used tables with proper linking.
 * Run: npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const repoRoot = process.cwd();

function loadEnvFile(fileName: string): Record<string, string> {
  const p = join(repoRoot, fileName);
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
  return out;
}

function getCurrentBranch(): string | null {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", cwd: repoRoot }).trim();
  } catch {
    return null;
  }
}

// Load env by branch (same as sync-env-by-branch): .env.development or .env.main, then .env.local overrides
const branch = getCurrentBranch();
const branchFile = branch === "main" ? ".env.main" : ".env.development";
const branchEnv = loadEnvFile(branchFile);
const localEnv = loadEnvFile(".env.local");
Object.entries(branchEnv).forEach(([k, v]) => (process.env[k] = v));
Object.entries(localEnv).forEach(([k, v]) => (process.env[k] = v));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in",
    branchFile,
    "or .env.local (see docs/supabase-branches.md)."
  );
  process.exit(1);
}
console.log("Using Supabase project from", branch ? `${branch} (${branchFile})` : ".env.local");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const FEE_TYPES = ["tuition", "transport", "library", "lab", "sports"] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function deleteAllData() {
  console.log("Flushing all app data...");
  // Order: child tables first (FK constraints)
  const tables = [
    "exam_result_subjects",
    "fee_collections",
    "fees",
    "student_photos",
    "student_documents",
    "admission_enquiries",
    "employee_attendance_approvals",
    "employee_attendance_daily",
    "employee_attendance_punches",
    "employee_salaries",
    "fee_structure_items",
    "expenses",
    "expense_budgets",
    "student_enrollments",
    "standard_divisions",
    "standards",
    "students",
    "employees",
    "subjects",
    "exam_subjects",
    "exams",
    "fee_structures",
    "holidays",
    "shifts",
    "academic_years",
    "expense_heads",
  ];
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t as "students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (!error) console.log(`  Cleared ${t}`);
    } catch {
      // Table might not exist or different schema
    }
  }
}

async function seedAcademicYears() {
  console.log("Seeding academic years...");
  const currentYear = new Date().getFullYear();
  const prevName = `${currentYear - 1}-${currentYear}`;
  const curName = `${currentYear}-${currentYear + 1}`;

  await supabase.from("academic_years").insert([
    {
      name: prevName,
      sort_order: 1,
      start_date: `${currentYear - 1}-06-01`,
      end_date: `${currentYear}-05-31`,
      status: "closed",
    },
    {
      name: curName,
      sort_order: 2,
      start_date: `${currentYear}-06-01`,
      end_date: `${currentYear + 1}-05-31`,
      status: "active",
    },
  ]);
  console.log("  Inserted academic years", prevName, "and", curName);
}

async function main() {
  console.log("Starting seed (50 students, 20 employees)...");
  await deleteAllData();

  await seedAcademicYears();
  await seedStandards();
  await seedStandardDivisionsAndDivisions();
  await seedShifts();
  await seedExpenseHeads();
  await seedHolidays();
  await seedSubjects();
  await seedFeeStructures();
  await seedExams();
  await seedEmployees();
  await seedStudents();
  await seedFeeCollections();
  await seedExpenses();
  await seedExpenseBudgets();
  await seedAttendance();

  console.log("Seed completed successfully!");
}

async function seedStandards() {
  console.log("Seeding standards...");
  const standards = [
    // Pre-primary
    { name: "Nursery", section: "pre_primary", sort_order: 0 },
    { name: "Junior KG (LKG)", section: "pre_primary", sort_order: 1 },
    { name: "Senior KG (UKG)", section: "pre_primary", sort_order: 2 },
    // Primary (1 to 8)
    ...Array.from({ length: 8 }, (_, i) => ({ name: String(i + 1), section: "primary", sort_order: i + 3 })),
    // Secondary (9-10)
    { name: "9", section: "secondary", sort_order: 11 },
    { name: "10", section: "secondary", sort_order: 12 },
    // Higher secondary (11-12)
    { name: "11", section: "higher_secondary", sort_order: 13 },
    { name: "12", section: "higher_secondary", sort_order: 14 },
  ];
  await supabase.from("standards").insert(standards);
}

async function seedStandardDivisionsAndDivisions() {
  console.log("Seeding standard divisions...");
  const { data: standards } = await supabase.from("standards").select("id, name, sort_order").order("sort_order");
  if (!standards?.length) return;

  const divisionNames = ["A", "B", "C"];
  for (const s of standards) {
    for (let i = 0; i < divisionNames.length; i++) {
      await supabase.from("standard_divisions").upsert(
        { standard_id: s.id, name: divisionNames[i], sort_order: i },
        { onConflict: "standard_id,name" }
      );
    }
  }

  console.log("  Standard divisions ready");
}

async function seedShifts() {
  console.log("Seeding shifts...");
  const shifts = [
    { name: "Morning", start_time: "07:00", end_time: "14:00", grace_period_minutes: 5, late_threshold_minutes: 15 },
    { name: "Day", start_time: "09:00", end_time: "17:00", grace_period_minutes: 5, late_threshold_minutes: 15 },
    { name: "Evening", start_time: "14:00", end_time: "21:00", grace_period_minutes: 5, late_threshold_minutes: 15 },
  ];
  await supabase.from("shifts").insert(shifts);
}

const EXPENSE_HEAD_NAMES = [
  { name: "Stationary", sort_order: 1 },
  { name: "Maintenance", sort_order: 2 },
  { name: "Entertainment", sort_order: 3 },
  { name: "Christmas", sort_order: 4 },
  { name: "Medicines", sort_order: 5 },
  { name: "Science Lab", sort_order: 6 },
  { name: "Salary", sort_order: 7 },
  { name: "Utilities", sort_order: 8 },
  { name: "Transport", sort_order: 9 },
  { name: "Other", sort_order: 99 },
];

async function seedExpenseHeads() {
  console.log("Seeding expense heads...");
  await supabase.from("expense_heads").insert(EXPENSE_HEAD_NAMES);
  console.log(`  Inserted ${EXPENSE_HEAD_NAMES.length} expense heads`);
}

async function seedHolidays() {
  console.log("Seeding holidays...");
  const { data: activeYear } = await supabase.from("academic_years").select("id").eq("status", "active").maybeSingle();
  const year = new Date().getFullYear();
  const holidays = [
    { date: `${year}-01-26`, name: "Republic Day", type: "public", academic_year_id: activeYear?.id ?? null },
    { date: `${year}-08-15`, name: "Independence Day", type: "public", academic_year_id: activeYear?.id ?? null },
    { date: `${year}-10-02`, name: "Gandhi Jayanti", type: "public", academic_year_id: activeYear?.id ?? null },
    { date: `${year}-12-25`, name: "Christmas", type: "public", academic_year_id: activeYear?.id ?? null },
  ];
  await supabase.from("holidays").insert(holidays);
}

async function seedSubjects() {
  console.log("Seeding subjects per standard...");
  const { data: standards } = await supabase.from("standards").select("id, name");
  if (!standards?.length) return;

  const subjectDefs = [
    { name: "English", code: "EN", eval: "mark" as const },
    { name: "Mathematics", code: "MATH", eval: "mark" as const },
    { name: "Science", code: "SCI", eval: "mark" as const },
    { name: "Hindi", code: "HIN", eval: "mark" as const },
    { name: "Art", code: "ART", eval: "grade" as const },
    { name: "Physical Education", code: "PE", eval: "grade" as const },
  ];

  for (const st of standards) {
    let so = 0;
    for (const s of subjectDefs) {
      await supabase.from("subjects").insert({
        standard_id: st.id,
        name: s.name,
        code: s.code,
        sort_order: ++so,
        evaluation_type: s.eval,
      });
    }
  }
  console.log(`  Added ${subjectDefs.length} subjects × ${standards.length} standards`);
}

async function seedFeeStructures() {
  console.log("Seeding fee structures...");
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
  const { data: fs } = await supabase
    .from("fee_structures")
    .insert({ name: "Primary 1-5", grade_from: "1", grade_to: "5", academic_year: ay })
    .select("id")
    .single();
  if (fs) {
    const items = [];
    for (const ft of FEE_TYPES) {
      for (let q = 1; q <= 4; q++) {
        items.push({ fee_structure_id: fs.id, fee_type: ft, quarter: q, amount: 2000 + randomInt(0, 3000) });
      }
    }
    await supabase.from("fee_structure_items").insert(items);
  }
  const { data: fs2 } = await supabase
    .from("fee_structures")
    .insert({ name: "Secondary 6-10", grade_from: "6", grade_to: "10", academic_year: ay })
    .select("id")
    .single();
  if (fs2) {
    const items = [];
    for (const ft of FEE_TYPES) {
      for (let q = 1; q <= 4; q++) {
        items.push({ fee_structure_id: fs2.id, fee_type: ft, quarter: q, amount: 3500 + randomInt(0, 4000) });
      }
    }
    await supabase.from("fee_structure_items").insert(items);
  }
}

async function seedExams() {
  console.log("Seeding exams...");
  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  if (!activeYear?.id) {
    console.log("  No active academic year, skipping exams.");
    return;
  }

  const { data: standards } = await supabase.from("standards").select("id, name").order("sort_order");
  if (!standards?.length) {
    console.log("  No standards, skipping exams.");
    return;
  }

  const currentYear = new Date().getFullYear();

  let examCount = 0;
  let subjectLinkCount = 0;

  for (const st of standards) {
    const examsToInsert = [
      { name: `Mid-Term - ${st.name}`, standard: st.name, term: "Term-1", description: `Mid-term exam for ${st.name}`, academic_year_id: activeYear.id },
      { name: `Final Exam - ${st.name}`, standard: st.name, term: "Term-2", description: `Final exam for ${st.name}`, academic_year_id: activeYear.id },
    ];
    const { data: inserted } = await supabase.from("exams").insert(examsToInsert).select("id, standard");
    if (inserted?.length) {
      examCount += inserted.length;
      const { data: subs } = await supabase.from("subjects").select("id, evaluation_type").eq("standard_id", st.id);
      for (const exam of inserted) {
        for (const sub of subs ?? []) {
          if (sub.evaluation_type === "mark") {
            await supabase.from("exam_subjects").insert({ exam_id: exam.id, subject_id: sub.id, max_marks: 100 });
            subjectLinkCount++;
          }
        }
      }
    }
  }

  console.log(`  Added ${examCount} exams for ${standards.length} standards, ${subjectLinkCount} exam_subjects.`);
}

// 20 employees with full variety: roles, departments, designations, types, statuses
const EMPLOYEE_ROLES = ["teacher", "teacher", "teacher", "teacher", "teacher", "staff", "staff", "staff", "staff", "staff"] as const;
const DEPARTMENTS = ["Mathematics", "Science", "English", "Hindi", "Social Studies", "Administration", "Sports", "Library", "Accounts", "IT Support"];
const DESIGNATIONS = ["Senior Teacher", "Teacher", "PGT", "TGT", "Principal", "Vice Principal", "Office Assistant", "Accountant", "Receptionist", "Librarian", "PE Teacher", "Lab Assistant", "Clerk", "Security"];
const EMPLOYEE_TYPES = ["full_time", "full_time", "full_time", "part_time", "contract", "temporary"] as const;
const EMPLOYEE_STATUSES = ["active", "active", "active", "active", "inactive", "resigned", "terminated"] as const;
const FIRST_NAMES = ["Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Suresh", "Kavita", "Ramesh", "Lakshmi", "Arun", "Deepa", "Kiran", "Meera", "Naveen", "Pooja", "Rahul", "Sunita", "Vijay", "Uma"];
const LAST_NAMES = ["Kumar", "Sharma", "Patel", "Reddy", "Singh", "Gupta", "Nair", "Desai", "Iyer", "Menon", "Pillai", "Nambiar", "Joshi", "Kapoor", "Verma", "Malhotra", "Shah", "Agarwal", "Rao", "Mehta"];

async function seedEmployees() {
  console.log("Seeding 20 employees...");
  const { data: shifts } = await supabase.from("shifts").select("id");
  const shiftIds = (shifts ?? []).map((s) => s.id);

  const usedNames = new Set<string>();
  const employees: Record<string, unknown>[] = [];
  for (let i = 0; i < 20; i++) {
    let name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    while (usedNames.has(name)) {
      name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    }
    usedNames.add(name);
    employees.push({
      full_name: name,
      email: `emp${i + 1}@school.edu`,
      phone_number: `98765${String(43210 + i).padStart(5, "0")}`,
      address: `${100 + i} Staff Colony, School Lane, City`,
      employee_id: `EMP-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      role: pick(EMPLOYEE_ROLES),
      department: pick(DEPARTMENTS),
      designation: pick(DESIGNATIONS),
      employee_type: pick(EMPLOYEE_TYPES),
      status: pick(EMPLOYEE_STATUSES),
      joining_date: randomDate(new Date(2018, 0, 1), new Date(2024, 5, 1)).toISOString().slice(0, 10),
      shift_id: shiftIds[i % shiftIds.length] ?? null,
      monthly_salary: 25000 + randomInt(0, 75000),
      aadhaar: i % 3 === 0 ? `9999${String(8000000000 + i).slice(-8)}` : null,
      pan: i % 4 === 0 ? `ABCDE${String(1000 + i).slice(-4)}F` : null,
    });
  }

  const { data: emps } = await supabase.from("employees").insert(
    employees.map((e, idx) => ({
      ...e,
      bank_name: pick(["State Bank", "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank"]),
      account_number: `1234567${String(idx).padStart(5, "0")}`,
      ifsc_code: pick(["SBIN0001234", "HDFC0001234", "ICIC0001234"]),
      account_holder_name: e.full_name,
      degree: pick(["B.Ed", "M.Ed", "M.Sc", "B.Sc", "B.A"]),
      institution: pick(["State University", "Central University", "Private College"]),
      year_passed: 2000 + randomInt(0, 20),
    }))
  ).select("id");
  console.log(`  Inserted ${emps?.length ?? 0} employees`);
}

// Student name parts for 100 varied names
const STUDENT_FIRST = ["Aarav", "Aditi", "Aisha", "Akash", "Ananya", "Arjun", "Aryan", "Avni", "Diya", "Ishaan", "Kavya", "Krishna", "Maya", "Neha", "Priya", "Rahul", "Riya", "Rohan", "Saanvi", "Siddharth", "Vivaan", "Anika", "Arnav", "Ishita", "Karan", "Nisha", "Ravi", "Sneha", "Varun", "Zara", "Abhay", "Bhavya", "Chetan", "Devika", "Esha", "Farhan", "Gayatri", "Harsh", "Ira", "Jai", "Kiara", "Laksh", "Mohan", "Naina", "Omkar", "Pranav", "Quasar", "Ritika", "Sahil", "Tanya", "Uday", "Ved", "Yash", "Aarohi", "Bhumika", "Dhruv", "Eshaan", "Gauri", "Himanshu", "Jhanvi", "Kunal", "Lavanya", "Manish", "Nikita", "Ojas", "Pooja", "Rishabh", "Shreya", "Tanvi", "Utkarsh", "Vansh", "Aadhya", "Advik", "Chhavi", "Daksh", "Ishani", "Kiaan", "Myra", "Navya", "Rehan", "Sara", "Vihaan", "Ayaan", "Disha", "Hridaan", "Kavya", "Mira", "Neel", "Reyansh", "Siya", "Vivaan", "Yuvaan", "Aaradhya", "Atharv", "Ishana", "Krish", "Mihir", "Nysa", "Rudra", "Vedika", "Aryan", "Dhyan", "Keya", "Reyansh", "Samar", "Vanya"];
const STUDENT_LAST = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Rao", "Nair", "Mehta", "Joshi", "Iyer", "Pillai", "Menon", "Nambiar", "Desai", "Shah", "Kapoor", "Agarwal", "Malhotra", "Verma", "Jain", "Bansal", "Chopra", "Dubey", "Garg", "Khanna", "Lal", "Mishra", "Oberoi", "Prasad", "Saxena", "Tiwari", "Bhatt", "Chandra", "Dutta", "Ghoshal", "Kulkarni", "Naidu", "Ranganathan", "Srinivas", "Venkatesh", "Bose", "Das", "Mukherjee", "Roy", "Banerjee", "Chatterjee", "Ghosh", "Basu", "Sen", "Mitra"];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const STUDENT_STATUSES = ["active", "active", "active", "active", "inactive", "transferred", "graduated", "suspended"] as const;
const CATEGORIES = ["general", "obc", "sc", "st", "other"] as const;
const GENDERS = ["male", "female", "other"] as const;
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other", null];
const DISTRICTS = ["Mumbai", "Pune", "Thane", "Nashik", "Nagpur", "Ahmedabad", "Surat", "Vadodara", "Bangalore", "Chennai", null];

async function seedStudents() {
  console.log("Seeding 50 students across current and previous academic years...");
  const { data: years } = await supabase
    .from("academic_years")
    .select("id, name, status, sort_order")
    .order("sort_order", { ascending: true });
  if (!years || years.length === 0) {
    console.log("  Skipping students: no academic years (configure academic years first)");
    return;
  }

  const activeYear = years.find((y) => (y as { status?: string }).status === "active") ?? years[years.length - 1];
  const previousYear =
    years
      .filter((y) => y.id !== activeYear.id)
      .sort(
        (a, b) =>
          ((a as { sort_order?: number }).sort_order ?? 0) - ((b as { sort_order?: number }).sort_order ?? 0)
      )[years.length > 1 ? years.length - 2 : 0] ?? null;

  const { data: grades } = await supabase.from("standards").select("id, name").order("sort_order");
  if (!grades?.length) {
    console.log("  Skipping students: no standards (run migrations first)");
    return;
  }

  const gradeDivisions: { gradeId: string; divisionId: string }[] = [];
  for (const g of grades) {
    const { data: divs } = await supabase.from("divisions").select("id").eq("standard_id", g.id).limit(4);
    for (const d of divs ?? []) {
      gradeDivisions.push({ gradeId: g.id, divisionId: d.id });
    }
  }
  if (gradeDivisions.length === 0) {
    console.log("  Skipping students: no divisions (run migrations first)");
    return;
  }

  const usedNames = new Set<string>();
  const students: Record<string, unknown>[] = [];
  const totalStudents = 50;
  for (let i = 0; i < totalStudents; i++) {
    let name = `${pick(STUDENT_FIRST)} ${pick(STUDENT_LAST)}`;
    while (usedNames.has(name)) {
      name = `${pick(STUDENT_FIRST)} ${pick(STUDENT_LAST)}`;
    }
    usedNames.add(name);
    const status = pick(STUDENT_STATUSES);
    const category = pick(CATEGORIES);
    const gender = pick(GENDERS);
    const dob = randomDate(new Date(2008, 0, 1), new Date(2018, 11, 31)).toISOString().slice(0, 10);
    const yearForStudent =
      previousYear && i >= Math.floor(totalStudents * 0.7) ? previousYear : activeYear;
    students.push({
      full_name: name,
      student_id: `STU-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      date_of_birth: dob,
      gender,
      blood_group: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
      status,
      category,
      admission_date: randomDate(new Date(2020, 0, 1), new Date(2024, 5, 1)).toISOString().slice(0, 10),
      academic_year: yearForStudent.name,
      roll_number: (i % 50) + 1,
      is_rte_quota: i % 5 === 0,
      address: `${200 + i} Block, ${pick(["Sector 5", "MG Road", "Park Street", "Lake View"])}, City`,
      district: pick(DISTRICTS),
      father_name: `${name.split(" ")[0]}'s Father`,
      mother_name: `${name.split(" ")[0]}'s Mother`,
      parent_contact: `98765${String(20000 + i).padStart(5, "0")}`,
      parent_email: `parent${i + 1}@email.com`,
      guardian_name: i % 7 === 0 ? `Guardian of ${name.split(" ")[0]}` : null,
      religion: pick(RELIGIONS),
      caste: category === "sc" || category === "st" ? "ST/SC" : null,
      birth_place: i % 4 === 0 ? "City Hospital" : null,
      last_school: null,
      aadhar_no: i % 2 === 0 ? `9999${String(8000000000 + i).slice(-8)}` : null,
      notes: i % 10 === 0 ? "Sample note" : null,
    });
  }

  const { data: inserted, error: insertError } = await supabase.from("students").insert(students).select("id");
  if (insertError) {
    console.error("  Error inserting students:", insertError.message);
    return;
  }
  if (!inserted?.length) {
    console.log("  No students inserted");
    return;
  }

  for (let i = 0; i < inserted.length; i++) {
    const { gradeId, divisionId } = pick(gradeDivisions);
    const yearForEnrollment =
      previousYear && i >= Math.floor(inserted.length * 0.7) ? previousYear : activeYear;

    await supabase.from("student_enrollments").insert({
      student_id: inserted[i].id,
      academic_year_id: yearForEnrollment.id,
      standard_id: gradeId,
      division_id: divisionId,
      status: "active",
    });
  }

  const rteCount = students.filter((s) => (s as { is_rte_quota?: boolean }).is_rte_quota).length;
  console.log(
    `  Inserted ${inserted.length} students (${rteCount} RTE) across ${
      previousYear ? 2 : 1
    } academic year(s), enrollments created`
  );
}

async function seedFeeCollections() {
  console.log("Seeding fee collections...");
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
  const { data: structures } = await supabase
    .from("fee_structures")
    .select("id, grade_from, grade_to, fee_structure_items(fee_type, quarter, amount)")
    .eq("academic_year", ay);
  const { data: students } = await supabase.from("students").select("id, standard, is_rte_quota").eq("status", "active");
  const nonRte = (students ?? []).filter((s) => !(s as { is_rte_quota?: boolean }).is_rte_quota);

  const GRADE_ORDER: Record<string, number> = {
    Nursery: 0,
    "Junior KG (LKG)": 1,
    "Senior KG (UKG)": 2,
    "1": 3, "2": 4, "3": 5, "4": 6, "5": 7, "6": 8, "7": 9, "8": 10, "9": 11, "10": 12, "11": 13, "12": 14,
  };
  const inRange = (g: string, f: string, t: string) => (GRADE_ORDER[g] ?? -1) >= (GRADE_ORDER[f] ?? -1) && (GRADE_ORDER[g] ?? -1) <= (GRADE_ORDER[t] ?? -1);

  let receiptNum = 1000;
  const collections: { student_id: string; amount: number; quarter: number; academic_year: string; fee_type: string; payment_mode: string; receipt_number: string }[] = [];

  for (const s of nonRte.slice(0, 12)) {
    const structure = (structures ?? []).find((st) => inRange(s.standard ?? "", st.grade_from, st.grade_to));
    if (!structure) continue;
    const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
    for (const item of items.slice(0, 3)) {
      if (Math.random() < 0.5) {
        const amt = Math.floor(Number(item.amount) * (0.3 + Math.random() * 0.7));
        collections.push({
          student_id: s.id,
          amount: amt,
          quarter: item.quarter,
          academic_year: ay,
          fee_type: item.fee_type,
          payment_mode: pick(["cash", "cheque", "online"]),
          receipt_number: `RCP-${receiptNum++}`,
        });
      }
    }
  }
  if (collections.length > 0) {
    await supabase.from("fee_collections").insert(collections);
  }
  console.log(`  Inserted ${collections.length} fee collections`);
}

async function seedExpenses() {
  console.log("Seeding expenses...");
  const { data: heads } = await supabase.from("expense_heads").select("id, name");
  const headById = (heads ?? []).reduce((acc, h) => ({ ...acc, [h.name.toLowerCase()]: h.id }), {} as Record<string, string>);
  const today = new Date().toISOString().slice(0, 10);
  const rows = [
    { expense_head_id: headById["salary"] ?? null, amount: 250000, description: "Monthly salaries", expense_date: today },
    { expense_head_id: headById["utilities"] ?? null, amount: 12000, description: "Electricity", expense_date: today },
    { expense_head_id: headById["stationary"] ?? null, amount: 8000, description: "Stationery", expense_date: today },
    { expense_head_id: headById["maintenance"] ?? null, amount: 5000, description: "Building repair", expense_date: today },
  ];
  await supabase.from("expenses").insert(rows);
  console.log(`  Inserted ${rows.length} expenses`);
}

async function seedExpenseBudgets() {
  console.log("Seeding expense budgets...");
  const { data: activeYear } = await supabase.from("academic_years").select("id").eq("status", "active").maybeSingle();
  const { data: heads } = await supabase.from("expense_heads").select("id");
  if (!activeYear?.id || !heads?.length) {
    console.log("  Skipping (no active year or expense heads)");
    return;
  }
  const rows = (heads as { id: string }[]).map((h) => ({
    expense_head_id: h.id,
    academic_year_id: activeYear.id,
    amount: 10000 + randomInt(0, 90000),
  }));
  await supabase.from("expense_budgets").insert(rows);
  console.log(`  Inserted ${rows.length} expense budgets for active year`);
}

async function seedAttendance() {
  console.log("Seeding attendance...");
  const { data: employees } = await supabase.from("employees").select("id").eq("status", "active");
  const today = new Date().toISOString().slice(0, 10);
  const punches: { employee_id: string; punch_date: string; punch_time: string; punch_type: string; source: string; is_late: boolean }[] = [];

  for (const e of employees ?? []) {
    if (Math.random() < 0.9) {
      const h = 7 + Math.floor(Math.random() * 2);
      const m = Math.floor(Math.random() * 60);
      punches.push({
        employee_id: e.id,
        punch_date: today,
        punch_time: `${today}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`,
        punch_type: "IN",
        source: Math.random() < 0.7 ? "biometric" : "manual",
        is_late: Math.random() < 0.1,
      });
      punches.push({
        employee_id: e.id,
        punch_date: today,
        punch_time: `${today}T${String(16 + Math.floor(Math.random() * 2)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00Z`,
        punch_type: "OUT",
        source: Math.random() < 0.7 ? "biometric" : "manual",
        is_late: false,
      });
    }
  }
  if (punches.length > 0) {
    await supabase.from("employee_attendance_punches").insert(punches);
  }
  console.log(`  Inserted ${punches.length} attendance punches`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
