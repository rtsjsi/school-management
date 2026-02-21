/**
 * Seed script: Flush all app data and insert clean test data.
 * 20 students + 20 employees with full variety.
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
    "student_enrollments",
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
  console.log("Starting seed (20 students, 20 employees)...");
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
    { name: "English", code: "EN", eval: "mark" as const },
    { name: "Mathematics", code: "MATH", eval: "mark" as const },
    { name: "Science", code: "SCI", eval: "mark" as const },
    { name: "Hindi", code: "HIN", eval: "mark" as const },
    { name: "Art", code: "ART", eval: "grade" as const },
    { name: "Physical Education", code: "PE", eval: "grade" as const },
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
    { name: "Mid-Term 1", exam_type: "midterm", subject: "All", grade: "5", held_at: new Date().toISOString().slice(0, 10), description: "First mid-term" },
    { name: "Final Exam", exam_type: "final", subject: "All", grade: "All", held_at: new Date(new Date().getFullYear(), 2, 15).toISOString().slice(0, 10), description: "Annual final" },
  ];
  const { data: inserted } = await supabase.from("exams").insert(exams).select("id, grade");
  if (inserted?.length) {
    const examWithGrade = inserted.find((e) => e.grade && e.grade !== "All");
    if (examWithGrade) {
      const { data: classRow } = await supabase.from("classes").select("id").eq("name", examWithGrade.grade).maybeSingle();
      if (classRow?.id) {
        const { data: subs } = await supabase.from("subjects").select("id, evaluation_type").eq("class_id", classRow.id);
        for (const sub of subs ?? []) {
          if (sub.evaluation_type === "mark") {
            await supabase.from("exam_subjects").insert({ exam_id: examWithGrade.id, subject_id: sub.id, max_marks: 100 });
          }
        }
        console.log(`  Added exam_subjects for ${examWithGrade.grade}`);
      }
    }
  }
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

  const { data: emps } = await supabase.from("employees").insert(employees).select("id, full_name");
  if (emps) {
    for (const e of emps) {
      await supabase.from("employee_bank_accounts").insert({
        employee_id: e.id,
        bank_name: pick(["State Bank", "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank"]),
        account_number: `1234567${String(emps.indexOf(e)).padStart(5, "0")}`,
        ifsc_code: pick(["SBIN0001234", "HDFC0001234", "ICIC0001234"]),
        account_holder_name: e.full_name,
        is_primary: true,
      });
    }
  }
  console.log(`  Inserted ${emps?.length ?? 0} employees`);
}

// Student name parts for 100 varied names
const STUDENT_FIRST = ["Aarav", "Aditi", "Aisha", "Akash", "Ananya", "Arjun", "Aryan", "Avni", "Diya", "Ishaan", "Kavya", "Krishna", "Maya", "Neha", "Priya", "Rahul", "Riya", "Rohan", "Saanvi", "Siddharth", "Vivaan", "Anika", "Arnav", "Ishita", "Karan", "Nisha", "Ravi", "Sneha", "Varun", "Zara", "Abhay", "Bhavya", "Chetan", "Devika", "Esha", "Farhan", "Gayatri", "Harsh", "Ira", "Jai", "Kiara", "Laksh", "Mohan", "Naina", "Omkar", "Pranav", "Quasar", "Ritika", "Sahil", "Tanya", "Uday", "Ved", "Yash", "Aarohi", "Bhumika", "Dhruv", "Eshaan", "Gauri", "Himanshu", "Jhanvi", "Kunal", "Lavanya", "Manish", "Nikita", "Ojas", "Pooja", "Rishabh", "Shreya", "Tanvi", "Utkarsh", "Vansh", "Aadhya", "Advik", "Chhavi", "Daksh", "Ishani", "Kiaan", "Myra", "Navya", "Rehan", "Sara", "Vihaan", "Ayaan", "Disha", "Hridaan", "Kavya", "Mira", "Neel", "Reyansh", "Siya", "Vivaan", "Yuvaan", "Aaradhya", "Atharv", "Ishana", "Krish", "Mihir", "Nysa", "Rudra", "Vedika", "Aryan", "Dhyan", "Keya", "Reyansh", "Samar", "Vanya"];
const STUDENT_LAST = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Reddy", "Rao", "Nair", "Mehta", "Joshi", "Iyer", "Pillai", "Menon", "Nambiar", "Desai", "Shah", "Kapoor", "Agarwal", "Malhotra", "Verma", "Jain", "Bansal", "Chopra", "Dubey", "Garg", "Khanna", "Lal", "Mishra", "Oberoi", "Prasad", "Saxena", "Tiwari", "Bhatt", "Chandra", "Dutta", "Ghoshal", "Kulkarni", "Naidu", "Ranganathan", "Srinivas", "Venkatesh", "Bose", "Das", "Mukherjee", "Roy", "Banerjee", "Chatterjee", "Ghosh", "Basu", "Sen", "Mitra"];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const STUDENT_STATUSES = ["active", "active", "active", "active", "inactive", "transferred", "graduated", "suspended"] as const;
const CATEGORIES = ["general", "obc", "sc", "st", "other"] as const;
const ADMISSION_TYPES = ["regular", "transfer", "re-admission"] as const;
const GENDERS = ["male", "female", "other"] as const;
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other", null];
const DISTRICTS = ["Mumbai", "Pune", "Thane", "Nashik", "Nagpur", "Ahmedabad", "Surat", "Vadodara", "Bangalore", "Chennai", null];

async function seedStudents() {
  console.log("Seeding 20 students...");
  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();
  if (!activeYear) {
    console.log("  Skipping students: no active academic year (run migrations first)");
    return;
  }

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
  for (let i = 0; i < 20; i++) {
    let name = `${pick(STUDENT_FIRST)} ${pick(STUDENT_LAST)}`;
    while (usedNames.has(name)) {
      name = `${pick(STUDENT_FIRST)} ${pick(STUDENT_LAST)}`;
    }
    usedNames.add(name);
    const status = pick(STUDENT_STATUSES);
    const category = pick(CATEGORIES);
    const admissionType = pick(ADMISSION_TYPES);
    const gender = pick(GENDERS);
    const dob = randomDate(new Date(2008, 0, 1), new Date(2018, 11, 31)).toISOString().slice(0, 10);
    students.push({
      full_name: name,
      email: `stu${i + 1}@school.edu`,
      student_id: `STU-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      date_of_birth: dob,
      gender,
      blood_group: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
      status,
      category,
      admission_type: admissionType,
      admission_date: randomDate(new Date(2020, 0, 1), new Date(2024, 5, 1)).toISOString().slice(0, 10),
      academic_year: activeYear.name,
      roll_number: (i % 50) + 1,
      is_rte_quota: i % 5 === 0,
      address: `${200 + i} Block, ${pick(["Sector 5", "MG Road", "Park Street", "Lake View"])}, City`,
      district: pick(DISTRICTS),
      society: i % 3 === 0 ? `Society ${String(i + 1)}` : null,
      phone_number: `98765${String(10000 + i).padStart(5, "0")}`,
      father_name: `${name.split(" ")[0]}'s Father`,
      mother_name: `${name.split(" ")[0]}'s Mother`,
      parent_contact: `98765${String(20000 + i).padStart(5, "0")}`,
      parent_email: `parent${i + 1}@email.com`,
      guardian_name: i % 7 === 0 ? `Guardian of ${name.split(" ")[0]}` : null,
      religion: pick(RELIGIONS),
      caste: category === "sc" || category === "st" ? "ST/SC" : null,
      birth_place: i % 4 === 0 ? "City Hospital" : null,
      last_school: admissionType === "transfer" ? "Previous School" : null,
      aadhar_no: i % 2 === 0 ? `9999${String(8000000000 + i).slice(-8)}` : null,
      notes: i % 10 === 0 ? "Sample note" : null,
    });
  }

  const { data: inserted } = await supabase.from("students").insert(students).select("id");
  if (!inserted?.length) {
    console.log("  No students inserted");
    return;
  }

  for (let i = 0; i < inserted.length; i++) {
    const { gradeId, divisionId } = pick(gradeDivisions);
    await supabase.from("student_enrollments").insert({
      student_id: inserted[i].id,
      academic_year_id: activeYear.id,
      standard_id: gradeId,
      division_id: divisionId,
      status: "active",
    });
  }

  const rteCount = students.filter((s) => (s as { is_rte_quota?: boolean }).is_rte_quota).length;
  console.log(`  Inserted ${inserted.length} students (${rteCount} RTE), enrollments created`);
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
