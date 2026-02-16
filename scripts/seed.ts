/**
 * Seed script: Flush all app data and insert dummy data for testing.
 * Run: npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8").split("\n").forEach((line) => {
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

const FIRST_NAMES = [
  "Aarav", "Aditi", "Aisha", "Akash", "Ananya", "Arjun", "Aryan", "Avni", "Diya", "Ishaan",
  "Kavya", "Krishna", "Maya", "Neha", "Priya", "Rahul", "Riya", "Rohan", "Saanvi", "Siddharth",
  "Sneha", "Vikram", "Vishal", "Yash", "Zara", "Abhay", "Anjali", "Bhavya", "Chetan", "Disha",
  "Esha", "Gaurav", "Harsh", "Ishita", "Jatin", "Karan", "Lakshmi", "Manish", "Nidhi", "Omkar",
  "Pooja", "Ravi", "Shreya", "Tanvi", "Uday", "Varun", "Ankit", "Bhumika", "Chirag", "Devika",
];

const LAST_NAMES = [
  "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Rao", "Nair", "Mehta", "Joshi",
  "Iyer", "Pillai", "Menon", "Nambiar", "Desai", "Shah", "Kapoor", "Agarwal", "Malhotra", "Verma",
];

const GRADES = ["Jr KG", "Sr KG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SECTIONS = ["A", "B", "C", "D"];
const GENDERS = ["male", "female"] as const;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const STATUSES = ["active", "active", "active", "active", "inactive", "transferred"] as const;
const FEE_TYPES = ["tuition", "transport", "library", "lab", "sports"] as const;
const DEPARTMENTS = ["Mathematics", "Science", "English", "Hindi", "Social Studies", "Administration", "Sports"];
const EMPLOYEE_NAMES = [
  "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh",
  "Anjali Gupta", "Suresh Nair", "Kavita Desai", "Ramesh Iyer", "Lakshmi Menon",
  "Manoj Joshi", "Deepa Pillai", "Arun Nambiar", "Sunita Rao", "Prakash Shah",
];

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
  const tables = [
    "fee_collections", "fees", "exam_results", "attendance_approved", "attendance_month_approvals",
    "attendance_manual", "attendance_punches", "employee_salaries", "employee_bank_accounts",
    "employee_qualifications", "fee_structure_items", "students", "employees",
    "fee_structures", "exams", "expenses", "holidays", "shifts", "classes",
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t as "fee_collections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) console.log(`  Cleared ${t}`);
  }
}

async function main() {
  console.log("Starting seed...");
  await deleteAllData();

  await seedClasses();
  await seedShifts();
  await seedHolidays();
  await seedFeeStructures();
  await seedEmployees();
  await seedStudents();
  await seedFeeCollectionsFromStructure();
  await seedExams();
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
        items.push({ fee_structure_id: fs.id, fee_type: ft, quarter: q, amount: 2000 + Math.random() * 3000 });
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
        items.push({ fee_structure_id: fs2.id, fee_type: ft, quarter: q, amount: 3500 + Math.random() * 4000 });
      }
    }
    await supabase.from("fee_structure_items").insert(items);
  }
}

async function seedEmployees() {
  console.log("Seeding employees...");
  const { data: shifts } = await supabase.from("shifts").select("id");
  const shiftIds = (shifts ?? []).map((s) => s.id);
  const employees: { full_name: string; email: string; role: string; department: string; designation: string; employee_type: string; shift_id: string | null; monthly_salary: number; employee_id: string }[] = [];
  for (let i = 0; i < 35; i++) {
    const name = EMPLOYEE_NAMES[i % EMPLOYEE_NAMES.length] + (i >= EMPLOYEE_NAMES.length ? ` ${i}` : "");
    employees.push({
      full_name: name,
      email: `emp${i + 1}@school.edu`,
      role: i < 5 ? "teacher" : "staff",
      department: pick(DEPARTMENTS),
      designation: i < 5 ? "Senior Teacher" : "Staff",
      employee_type: "full_time",
      shift_id: shiftIds[i % shiftIds.length] ?? null,
      monthly_salary: 25000 + randomInt(0, 50000),
      employee_id: `EMP-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    });
  }
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
}

async function seedStudents() {
  console.log("Seeding 500 students...");
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
  const students: { full_name: string; email: string; grade: string; section: string; roll_number: number; status: string; gender: string; blood_group: string; is_rte_quota: boolean; student_id: string; admission_date: string; academic_year: string; parent_name: string; parent_contact: string }[] = [];
  const rteCount = Math.floor(500 * 0.25);
  for (let i = 0; i < 500; i++) {
    const fname = pick(FIRST_NAMES);
    const lname = pick(LAST_NAMES);
    const fullName = `${fname} ${lname} ${i}`;
    const grade = pick(GRADES);
    const section = pick(SECTIONS);
    const isRte = i < rteCount;
    students.push({
      full_name: fullName,
      email: `stu${i + 1}@school.edu`,
      grade,
      section,
      roll_number: (i % 40) + 1,
      status: pick(STATUSES),
      gender: pick(GENDERS),
      blood_group: pick(BLOOD_GROUPS),
      is_rte_quota: isRte,
      student_id: `STU-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      admission_date: randomDate(new Date(2020, 0, 1), new Date(2024, 5, 1)).toISOString().slice(0, 10),
      academic_year: ay,
      parent_name: `${lname} Parent`,
      parent_contact: `98765${String(i).padStart(5, "0")}`,
    });
  }
  const batchSize = 100;
  for (let i = 0; i < students.length; i += batchSize) {
    await supabase.from("students").insert(students.slice(i, i + batchSize));
  }
  console.log(`Inserted ${students.length} students (${rteCount} RTE)`);
}

async function seedFeeCollectionsFromStructure() {
  console.log("Seeding fee collections (from structure)...");
  const ay = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
  const { data: structures } = await supabase.from("fee_structures").select("id, grade_from, grade_to, fee_structure_items(fee_type, quarter, amount)").eq("academic_year", ay);
  const { data: students } = await supabase.from("students").select("id, grade, is_rte_quota").eq("status", "active");
  const nonRte = (students ?? []).filter((s) => !(s as { is_rte_quota?: boolean }).is_rte_quota);

  const GRADE_ORDER: Record<string, number> = { "Jr KG": 0, "Sr KG": 1, "1": 2, "2": 3, "3": 4, "4": 5, "5": 6, "6": 7, "7": 8, "8": 9, "9": 10, "10": 11, "11": 12, "12": 13 };
  const inRange = (g: string, f: string, t: string) => (GRADE_ORDER[g] ?? -1) >= (GRADE_ORDER[f] ?? -1) && (GRADE_ORDER[g] ?? -1) <= (GRADE_ORDER[t] ?? -1);

  let receiptNum = 1000;
  const collections: { student_id: string; amount: number; quarter: number; academic_year: string; fee_type: string; payment_mode: string; receipt_number: string }[] = [];

  for (const s of nonRte.slice(0, 150)) {
    const structure = (structures ?? []).find((st) => inRange(s.grade ?? "", st.grade_from, st.grade_to));
    if (!structure) continue;
    const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
    for (const item of items.slice(0, 3)) {
      if (Math.random() < 0.4) {
        const amt = Math.floor(Number(item.amount) * (0.2 + Math.random() * 0.8));
        collections.push({
          student_id: s.id,
          amount: amt,
          quarter: item.quarter,
          academic_year: ay,
          fee_type: item.fee_type,
          payment_mode: pick(["cash", "cheque", "online"] as const),
          receipt_number: `RCP-${receiptNum++}`,
        });
      }
    }
  }
  if (collections.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < collections.length; i += batchSize) {
      await supabase.from("fee_collections").insert(collections.slice(i, i + batchSize));
    }
  }
  console.log(`Inserted ${collections.length} fee collections`);
}

async function seedExams() {
  console.log("Seeding exams...");
  const exams = [
    { name: "Mid-Term 1", exam_type: "midterm", subject: "All", grade: "All", held_at: new Date().toISOString().slice(0, 10), description: "First mid-term" },
    { name: "Final Exam", exam_type: "final", subject: "All", grade: "All", held_at: new Date(new Date().getFullYear(), 2, 15).toISOString().slice(0, 10), description: "Annual final" },
  ];
  await supabase.from("exams").insert(exams);
}

async function seedExpenses() {
  console.log("Seeding expenses...");
  const expenses = [
    { category: "salary", amount: 500000, description: "Monthly salaries", expense_date: new Date().toISOString().slice(0, 10) },
    { category: "utilities", amount: 15000, description: "Electricity", expense_date: new Date().toISOString().slice(0, 10) },
    { category: "supplies", amount: 10000, description: "Stationery", expense_date: new Date().toISOString().slice(0, 10) },
  ];
  await supabase.from("expenses").insert(expenses);
}

async function seedAttendance() {
  console.log("Seeding attendance...");
  const { data: employees } = await supabase.from("employees").select("id").eq("status", "active");
  const today = new Date().toISOString().slice(0, 10);
  const punches: { employee_id: string; punch_date: string; punch_time: string; punch_type: string; source: string; is_late: boolean }[] = [];
  for (const e of employees ?? []) {
    if (Math.random() < 0.85) {
      punches.push({
        employee_id: e.id,
        punch_date: today,
        punch_time: `${String(7 + Math.floor(Math.random() * 2)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
        punch_type: "IN",
        source: Math.random() < 0.7 ? "biometric" : "manual",
        is_late: Math.random() < 0.1,
      });
      punches.push({
        employee_id: e.id,
        punch_date: today,
        punch_time: `${String(16 + Math.floor(Math.random() * 2)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00`,
        punch_type: "OUT",
        source: Math.random() < 0.7 ? "biometric" : "manual",
        is_late: false,
      });
    }
  }
  const batchSize = 50;
  for (let i = 0; i < punches.length; i += batchSize) {
    await supabase.from("attendance_punches").insert(punches.slice(i, i + batchSize));
  }
  console.log(`Inserted ${punches.length} attendance punches`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
