/**
 * Seed script: Flush all app data and insert clean test data.
 * 20 students + 10 employees with full variety.
 * Run: npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

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
    "exam_results",
    "fee_collections",
    "fees",
    "student_photos",
    "student_documents",
    "admission_enquiries",
    "attendance_approved",
    "attendance_month_approvals",
    "attendance_manual",
    "attendance_punches",
    "employee_salaries",
    "employee_bank_accounts",
    "employee_qualifications",
    "fee_structure_items",
    "expenses",
    "students",
    "employees",
    "subjects",
    "exams",
    "fee_structures",
    "holidays",
    "shifts",
    "classes",
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

async function main() {
  console.log("Starting seed (20 students, 10 employees)...");
  await deleteAllData();

  await seedClasses();
  await seedShifts();
  await seedHolidays();
  await seedSubjects();
  await seedFeeStructures();
  await seedExams();
  await seedEmployees();
  await seedStudents();
  await seedFeeCollections();
  await seedExpenses();
  await seedAttendance();

  console.log("Seed completed successfully!");
}

async function seedClasses() {
  console.log("Seeding classes...");
  const classes = [
    { name: "Jr KG", section: "pre_primary", sort_order: 0 },
    { name: "Sr KG", section: "pre_primary", sort_order: 1 },
    ...Array.from({ length: 8 }, (_, i) => ({ name: String(i + 1), section: "primary", sort_order: i + 2 })),
    { name: "9", section: "secondary", sort_order: 10 },
    { name: "10", section: "secondary", sort_order: 11 },
    { name: "11", section: "higher_secondary", sort_order: 12 },
    { name: "12", section: "higher_secondary", sort_order: 13 },
  ];
  await supabase.from("classes").insert(classes);
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

async function seedHolidays() {
  console.log("Seeding holidays...");
  const year = new Date().getFullYear();
  const holidays = [
    { date: `${year}-01-26`, name: "Republic Day", type: "public" },
    { date: `${year}-08-15`, name: "Independence Day", type: "public" },
    { date: `${year}-10-02`, name: "Gandhi Jayanti", type: "public" },
    { date: `${year}-12-25`, name: "Christmas", type: "public" },
  ];
  await supabase.from("holidays").insert(holidays);
}

async function seedSubjects() {
  console.log("Seeding subjects per class...");
  const { data: classes } = await supabase.from("classes").select("id, name");
  if (!classes?.length) return;

  const subjectDefs = [
    { name: "English", code: "EN", eval: "mark" as const, max: 100 },
    { name: "Mathematics", code: "MATH", eval: "mark" as const, max: 100 },
    { name: "Science", code: "SCI", eval: "mark" as const, max: 100 },
    { name: "Hindi", code: "HIN", eval: "mark" as const, max: 100 },
    { name: "Art", code: "ART", eval: "grade" as const, max: null },
    { name: "Physical Education", code: "PE", eval: "grade" as const, max: null },
  ];

  for (const c of classes) {
    let so = 0;
    for (const s of subjectDefs) {
      await supabase.from("subjects").insert({
        class_id: c.id,
        name: s.name,
        code: s.code,
        sort_order: ++so,
        evaluation_type: s.eval,
        max_marks: s.max,
      });
    }
  }
  console.log(`  Added ${subjectDefs.length} subjects × ${classes.length} classes`);
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
  const exams = [
    { name: "Mid-Term 1", exam_type: "midterm", subject: "All", grade: "All", held_at: new Date().toISOString().slice(0, 10), description: "First mid-term" },
    { name: "Final Exam", exam_type: "final", subject: "All", grade: "All", held_at: new Date(new Date().getFullYear(), 2, 15).toISOString().slice(0, 10), description: "Annual final" },
  ];
  await supabase.from("exams").insert(exams);
}

// 10 employees with full variety: roles, departments, types, statuses
const EMPLOYEES_SEED = [
  { full_name: "Rajesh Kumar", role: "teacher", department: "Mathematics", designation: "Senior Teacher", employee_type: "full_time", status: "active" },
  { full_name: "Priya Sharma", role: "teacher", department: "Science", designation: "Teacher", employee_type: "full_time", status: "active" },
  { full_name: "Amit Patel", role: "teacher", department: "English", designation: "PGT", employee_type: "full_time", status: "active" },
  { full_name: "Sneha Reddy", role: "teacher", department: "Hindi", designation: "TGT", employee_type: "full_time", status: "active" },
  { full_name: "Vikram Singh", role: "teacher", department: "Social Studies", designation: "Teacher", employee_type: "part_time", status: "active" },
  { full_name: "Anjali Gupta", role: "staff", department: "Administration", designation: "Office Assistant", employee_type: "full_time", status: "active" },
  { full_name: "Suresh Nair", role: "staff", department: "Administration", designation: "Accountant", employee_type: "full_time", status: "active" },
  { full_name: "Kavita Desai", role: "staff", department: "Administration", designation: "Receptionist", employee_type: "full_time", status: "active" },
  { full_name: "Ramesh Iyer", role: "staff", department: "Sports", designation: "PE Assistant", employee_type: "contract", status: "active" },
  { full_name: "Lakshmi Menon", role: "staff", department: "Administration", designation: "Librarian", employee_type: "full_time", status: "inactive" },
];

async function seedEmployees() {
  console.log("Seeding 10 employees...");
  const { data: shifts } = await supabase.from("shifts").select("id");
  const shiftIds = (shifts ?? []).map((s) => s.id);

  const employees = EMPLOYEES_SEED.map((e, i) => ({
    ...e,
    email: `emp${i + 1}@school.edu`,
    phone_number: `98765${String(43210 + i).padStart(5, "0")}`,
    address: `${100 + i} School Lane, City`,
    employee_id: `EMP-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    joining_date: randomDate(new Date(2018, 0, 1), new Date(2023, 5, 1)).toISOString().slice(0, 10),
    shift_id: shiftIds[i % shiftIds.length] ?? null,
    monthly_salary: 25000 + randomInt(0, 50000),
  }));

  const { data: emps } = await supabase.from("employees").insert(employees).select("id, full_name");
  if (emps) {
    for (const e of emps) {
      await supabase.from("employee_bank_accounts").insert({
        employee_id: e.id,
        bank_name: "State Bank",
        account_number: `1234567${String(emps.indexOf(e)).padStart(5, "0")}`,
        ifsc_code: "SBIN0001234",
        account_holder_name: e.full_name,
        is_primary: true,
      });
    }
  }
  console.log(`  Inserted ${emps?.length ?? 0} employees`);
}

// 20 students with full variety: grades, sections, statuses, RTE, gender, category, admission types
const STUDENTS_SEED = [
  { full_name: "Aarav Sharma", grade: "Jr KG", section: "A", status: "active", is_rte: false, gender: "male", category: "general" },
  { full_name: "Aditi Patel", grade: "Sr KG", section: "B", status: "active", is_rte: true, gender: "female", category: "obc" },
  { full_name: "Aisha Singh", grade: "1", section: "A", status: "active", is_rte: false, gender: "female", category: "general" },
  { full_name: "Akash Kumar", grade: "2", section: "C", status: "active", is_rte: true, gender: "male", category: "sc" },
  { full_name: "Ananya Gupta", grade: "3", section: "B", status: "active", is_rte: false, gender: "female", category: "general" },
  { full_name: "Arjun Reddy", grade: "4", section: "D", status: "active", is_rte: false, gender: "male", category: "st" },
  { full_name: "Aryan Rao", grade: "5", section: "A", status: "active", is_rte: true, gender: "male", category: "obc" },
  { full_name: "Avni Nair", grade: "6", section: "B", status: "active", is_rte: false, gender: "female", category: "general" },
  { full_name: "Diya Mehta", grade: "7", section: "C", status: "active", is_rte: false, gender: "female", category: "other" },
  { full_name: "Ishaan Joshi", grade: "8", section: "A", status: "active", is_rte: true, gender: "male", category: "general" },
  { full_name: "Kavya Iyer", grade: "9", section: "B", status: "active", is_rte: false, gender: "female", category: "general" },
  { full_name: "Krishna Pillai", grade: "10", section: "D", status: "active", is_rte: false, gender: "male", category: "obc" },
  { full_name: "Maya Menon", grade: "11", section: "A", status: "active", is_rte: false, gender: "female", category: "general" },
  { full_name: "Neha Nambiar", grade: "12", section: "B", status: "active", is_rte: false, gender: "female", category: "general" },
  { full_name: "Priya Desai", grade: "1", section: "D", status: "inactive", is_rte: false, gender: "female", category: "general" },
  { full_name: "Rahul Shah", grade: "5", section: "C", status: "transferred", is_rte: false, gender: "male", category: "general" },
  { full_name: "Riya Kapoor", grade: "3", section: "A", status: "active", is_rte: true, gender: "female", category: "general" },
  { full_name: "Rohan Agarwal", grade: "7", section: "B", status: "graduated", is_rte: false, gender: "male", category: "general" },
  { full_name: "Saanvi Malhotra", grade: "4", section: "C", status: "active", is_rte: false, gender: "female", category: "sc" },
  { full_name: "Siddharth Verma", grade: "8", section: "D", status: "suspended", is_rte: false, gender: "male", category: "general" },
];

async function seedStudents() {
  console.log("Seeding 20 students...");
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const students = STUDENTS_SEED.map((s, i) => ({
    full_name: s.full_name,
    email: `stu${i + 1}@school.edu`,
    grade: s.grade,
    section: s.section,
    roll_number: (i % 40) + 1,
    status: s.status,
    gender: s.gender,
    blood_group: bloodGroups[i % bloodGroups.length],
    is_rte_quota: s.is_rte,
    category: s.category,
    student_id: `STU-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    admission_date: randomDate(new Date(2020, 0, 1), new Date(2024, 5, 1)).toISOString().slice(0, 10),
    admission_type: i % 5 === 0 ? "transfer" : i % 7 === 0 ? "re-admission" : "regular",
    academic_year: ay,
    parent_name: `${s.full_name.split(" ")[1]} Parent`,
    parent_contact: `98765${String(10000 + i).padStart(5, "0")}`,
    parent_email: `parent${i + 1}@email.com`,
  }));

  await supabase.from("students").insert(students);
  const rteCount = students.filter((s) => s.is_rte_quota).length;
  console.log(`  Inserted ${students.length} students (${rteCount} RTE, variety in status/category/grade)`);
}

async function seedFeeCollections() {
  console.log("Seeding fee collections...");
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
  const { data: structures } = await supabase
    .from("fee_structures")
    .select("id, grade_from, grade_to, fee_structure_items(fee_type, quarter, amount)")
    .eq("academic_year", ay);
  const { data: students } = await supabase.from("students").select("id, grade, is_rte_quota").eq("status", "active");
  const nonRte = (students ?? []).filter((s) => !(s as { is_rte_quota?: boolean }).is_rte_quota);

  const GRADE_ORDER: Record<string, number> = { "Jr KG": 0, "Sr KG": 1, "1": 2, "2": 3, "3": 4, "4": 5, "5": 6, "6": 7, "7": 8, "8": 9, "9": 10, "10": 11, "11": 12, "12": 13 };
  const inRange = (g: string, f: string, t: string) => (GRADE_ORDER[g] ?? -1) >= (GRADE_ORDER[f] ?? -1) && (GRADE_ORDER[g] ?? -1) <= (GRADE_ORDER[t] ?? -1);

  let receiptNum = 1000;
  const collections: { student_id: string; amount: number; quarter: number; academic_year: string; fee_type: string; payment_mode: string; receipt_number: string }[] = [];

  for (const s of nonRte.slice(0, 12)) {
    const structure = (structures ?? []).find((st) => inRange(s.grade ?? "", st.grade_from, st.grade_to));
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
  const today = new Date().toISOString().slice(0, 10);
  const expenses = [
    { category: "salary", amount: 250000, description: "Monthly salaries", expense_date: today },
    { category: "utilities", amount: 12000, description: "Electricity", expense_date: today },
    { category: "supplies", amount: 8000, description: "Stationery", expense_date: today },
    { category: "maintenance", amount: 5000, description: "Building repair", expense_date: today },
  ];
  await supabase.from("expenses").insert(expenses);
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
    await supabase.from("attendance_punches").insert(punches);
  }
  console.log(`  Inserted ${punches.length} attendance punches`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
