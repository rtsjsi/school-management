#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STAFF = [
  {
    employee_id: "EMP-2026-165459",
    full_name: "Gamit Marshalbhai Johnbhai",
    email: "marshgamit@gmail.com",
    phone_number: "8980087112",
    address: "139, Nishal faliyu, Nishana, Ta Subir, Dist Dang 394716",
    aadhaar: "270005188498",
    pan: "BFNPG1716G",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2022-06-01",
    degree: "MA. B.Ed",
    institution: "Angel English Medium School - Vyara",
    year_passed: 2025,
  },
  {
    employee_id: "EMP-2026-165948",
    full_name: "Kokani Viralben Dhirubhai",
    email: "kokaniviral3@gmail.com",
    phone_number: "9712552704",
    address: "At.Bhojpur Najik ( faliyu Dukan)Ta. Vyara, Dist. Tapi 394690",
    aadhaar: "629957216697",
    pan: "GEEPK5431R",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2019-06-01",
    degree: "B.SC , B.Ed",
    institution: "Angel English Medium School",
    year_passed: 2018,
  },
  {
    employee_id: "EMP-2026-166086",
    full_name: "Ashish Narottam Vasava",
    email: "ashishvasava1561995@gmail.com",
    phone_number: "9512625352",
    address: "At-sayajigaam Ta-Uchchhal Dist-Tapi Gujarat",
    aadhaar: "200982344656",
    pan: "BAQPV6118P",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2021-06-01",
    degree: "BA B.Ed",
    institution: "Angel English Medium School",
    year_passed: 2024,
  },
  {
    employee_id: "EMP-2026-166236",
    full_name: "Karishma Ashish vasava",
    email: "karigamit0212@gmail.com",
    phone_number: "6353395090",
    address: "At-sayajigaam Ta-Uchchhal Dist-Tapi Gujarat",
    aadhaar: "609193859295",
    pan: "BYHPG6526K",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2021-06-01",
    degree: "M.Sc, M.Ed",
    institution: "Angel English Medium School",
    year_passed: 2022,
  },
  {
    employee_id: "EMP-2026-166355",
    full_name: "Stafy Arpan Parmar",
    email: "stafyparmar567@gmail.com",
    phone_number: "9979580937",
    address: "301- Parishram Residensi, Nalu Faliyu, Vyara",
    aadhaar: "934632685945",
    pan: "ANRPC2889H",
    role: "staff",
    employee_type: "full_time",
    joining_date: "2014-06-01",
    degree: "B. A, Sanitory Inspector Diploma",
    institution: "Angel English Medium School",
    year_passed: 2010,
  },
  {
    employee_id: "EMP-2026-166479",
    full_name: "Sarasvati Nimeshkumar Gamit",
    email: "saraswatigamit@gmail.com",
    phone_number: "7623065464",
    address: "prathmik sala Bangli Faliyu,Ghuntvel  Songad,Tapi",
    aadhaar: "479414122987",
    pan: "DOTPG7303J",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2021-06-01",
    degree: "MA. M.Ed",
    institution: "Angel English Medium School",
    year_passed: 2021,
  },
  {
    employee_id: "EMP-2026-166599",
    full_name: "Silvanush Kishanbhai Gamit",
    email: "gamitsilvanush@gmail.com",
    phone_number: "8849276308",
    address: "At. po: Nishana, Ta. Songadh, Dist: Tapi, 394670",
    aadhaar: "647418062373",
    pan: "ASRPG1897L",
    role: "staff",
    employee_type: "full_time",
    joining_date: "2025-06-01",
    degree: "MA. B.ED",
    institution: null,
    year_passed: null,
  },
  {
    employee_id: "EMP-2026-166725",
    full_name: "Seema Suraj Prajapati",
    email: "seemakumbhar93@gmail.com",
    phone_number: "9409368494",
    address: "Jalaram society, Indu Vyara, Indu- Tapi Gujarat - 394650",
    aadhaar: "622256265022",
    pan: "IYVPK7556Q",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2022-06-01",
    degree: "B.Com, D.El.Ed",
    institution: "Angel English Medium School",
    year_passed: 2019,
  },
  {
    employee_id: "EMP-2026-166851",
    full_name: "Nayana Pareshbhai Gamit",
    email: "naynagamit123@gmail.com",
    phone_number: "8200002582",
    address: "ashram faliyu ta,lakhali,Lakhali,Tapi,Gujarat",
    aadhaar: "400390872588",
    pan: "AXAPG7363F",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2007-06-01",
    degree: "MA B.Ed",
    institution: "Angel English Medium School",
    year_passed: 2007,
  },
  {
    employee_id: "EMP-2026-166969",
    full_name: "Victor Kanubhai Gamit",
    email: "victorgamit7815@gmail.com",
    phone_number: "9274208477",
    address: "ashram faliyu ta,lakhali,Lakhali,Tapi,Gujarat",
    aadhaar: "476518219905",
    pan: "ERHPG8580B",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2019-08-13",
    degree: "B.E. (Mechanical)",
    institution: "Angel English Medium School",
    year_passed: 2019,
  },
  {
    employee_id: "EMP-2026-167053",
    full_name: "Carol jesuraja A",
    email: "carolkingmca@gmail.com",
    phone_number: "9080901742",
    address: "Angel English medium School, Tadkuva",
    aadhaar: "461776913193",
    pan: "AXJPC5358B",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2025-06-01",
    degree: "MCA , MA(Edu), B.Ed",
    institution: "Angel English Medium School",
    year_passed: 2025,
  },
  {
    employee_id: "EMP-2026-167155",
    full_name: "Christina kamlesh gamit",
    email: "christinagamit06@gmail.com",
    phone_number: "9106437830",
    address: "128 SARTHI RESIDENCY CHIKLI ROAD KANPURA \nVYARA",
    aadhaar: "942858487456",
    pan: "EWZPG9652K",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2026-06-01",
    degree: "B.A B.ed , M.A ( pursuing)",
    institution: "Angel English Medium School",
    year_passed: 2025,
  },
  {
    employee_id: "EMP-2026-167202",
    full_name: "Krupa Piljibhai Gamit",
    email: "krupagamit148@gmail.com",
    phone_number: "7046396732",
    address: "107, Patel Faliya, Nishana, Ta: Songadh, Dist: Tapi -394670",
    aadhaar: "385337467477",
    pan: "EXIPG6538Q",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2026-06-01",
    degree: "M.Sc. , B.Ed.",
    institution: "Angel English Medium School, Vyara",
    year_passed: 2026,
  },
  {
    employee_id: "EMP-2026-167250",
    full_name: "Padaliya Binal Akshay",
    email: "patelbinal3881@gmail.com",
    phone_number: "7016082320",
    address: "23- saiyam, Sanskruti soc. Vyara-394650",
    aadhaar: "253567085621",
    pan: "CFIPP8776B",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2026-06-01",
    degree: "M.com , B.Ed",
    institution: "Angel English Medium School",
    year_passed: 2018,
  },
  {
    employee_id: "EMP-2026-167299",
    full_name: "Gamit Truptiben Hemantbhai",
    email: "truptigamit22@gmail.com",
    phone_number: "9712249592",
    address: "406, bangali faliyu, Mirpur, Tapi 394655",
    aadhaar: "679775901587",
    pan: "AUTPG2501P",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2009-11-02",
    degree: "MA. B .ed",
    institution: "Angel English Medium school",
    year_passed: 2009,
  },
  {
    employee_id: "EMP-2026-167346",
    full_name: "Gamit Priyankaben sanjaykumar",
    email: "priyankagamit1985@gmail.com",
    phone_number: "9687449615",
    address: "71 sarpanch faliyu Raniamba vyara Tapi",
    aadhaar: "809082035502",
    pan: "CRNPG8465K",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2014-11-20",
    degree: "MA.B.ed",
    institution: "Angel English Medium school",
    year_passed: 2010,
  },
  {
    employee_id: "EMP-2026-167413",
    full_name: "Gamit Archana Sunilbhai",
    email: "archanasgamit@gmail.com",
    phone_number: "9978484208",
    address: "45,Parishram park society, Kanpura , Vyara 394650",
    aadhaar: "761519124421",
    pan: "BKGPG2089C",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2008-06-01",
    degree: "B.A",
    institution: "Angel English Medium School",
    year_passed: 2001,
  },
  {
    employee_id: "EMP-2026-167460",
    full_name: "Trupti Manjunath Soni",
    email: "truptikb1131@gmail.com",
    phone_number: "7046549690",
    address: "101, River view Complex, Kanpura, vyara",
    aadhaar: "200142143803",
    pan: "GNAPS4675G",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2026-04-13",
    degree: "MSC ( CA & IT)",
    institution: "Angel English Medium School",
    year_passed: 2015,
  },
  {
    employee_id: "EMP-2026-167534",
    full_name: "Vibha jyotindra bharti",
    email: "krishiv1105@gmail.com",
    phone_number: "9662504533",
    address: "415,krishna nagar society andharwadi road vyara Tapi-394650",
    aadhaar: "435903320613",
    pan: "CVMPB6126K",
    role: "teacher",
    employee_type: "full_time",
    joining_date: "2014-06-01",
    degree: "B A bharatnatyam",
    institution: "Angel English Medium School",
    year_passed: 2007,
  },
];

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function uuidForAadhaar(aadhaar) {
  const hash = crypto.createHash("sha1").update(`${NAMESPACE}staff:${aadhaar}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function sqlText(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlDate(value) {
  if (!value) return "NULL";
  return `${sqlText(value)}::date`;
}

function sqlInt(value) {
  if (value === null || value === undefined) return "NULL";
  return String(value);
}

const valueRows = STAFF.map((row) => {
  const id = uuidForAadhaar(row.aadhaar);
  return `(
    ${sqlText(id)}::uuid,
    ${sqlText(row.employee_id)},
    ${sqlText(row.full_name)},
    ${sqlText(row.email)},
    ${sqlText(row.phone_number)},
    ${sqlText(row.address)},
    ${sqlText(row.aadhaar)},
    ${sqlText(row.pan)},
    ${sqlText(row.role)},
    ${sqlText(row.employee_type)},
    ${sqlDate(row.joining_date)},
    ${sqlText("active")},
    ${sqlText(row.degree)},
    ${sqlText(row.institution)},
    ${sqlInt(row.year_passed)},
    ${sqlText(row.full_name)}
  )`;
}).join(",\n    ");

const sql = `-- Seed Angel English Medium School staff master data (19 employees).
-- Idempotent: skips rows already present by email or Aadhaar.
-- Source: staff_data_template.xlsx (June 2026 import)

WITH seed_rows (
  id,
  employee_id,
  full_name,
  email,
  phone_number,
  address,
  aadhaar,
  pan,
  role,
  employee_type,
  joining_date,
  status,
  degree,
  institution,
  year_passed,
  account_holder_name
) AS (
  VALUES
    ${valueRows}
)
INSERT INTO public.employees (
  id,
  employee_id,
  full_name,
  email,
  phone_number,
  address,
  aadhaar,
  pan,
  role,
  employee_type,
  joining_date,
  status,
  degree,
  institution,
  year_passed,
  account_holder_name
)
SELECT
  sr.id,
  sr.employee_id,
  sr.full_name,
  sr.email,
  sr.phone_number,
  sr.address,
  sr.aadhaar,
  sr.pan,
  sr.role,
  sr.employee_type,
  sr.joining_date,
  sr.status,
  sr.degree,
  sr.institution,
  sr.year_passed,
  sr.account_holder_name
FROM seed_rows sr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(sr.email, '')))
     OR (
       sr.aadhaar IS NOT NULL
       AND sr.aadhaar <> ''
       AND e.aadhaar IS NOT NULL
       AND e.aadhaar = sr.aadhaar
     )
);
`;

const outPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260630240000_import_staff_master_data.sql"
);
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath}`);
