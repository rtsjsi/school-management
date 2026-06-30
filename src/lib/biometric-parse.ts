// Parser for biometric attendance-log exports (e.g. ALOG_*.txt).
//
// The file is tab-delimited with a header row. Example:
//   No  TMNo  EnNo  Name  GMNo  Mode  In/Out  Antipass  ProxyWork  DateTime
//   23698  1  00000005    1  30  0  0  0  2026-01-02 08:17:28
//
// EnNo  = device enrollment number (maps to employees.biometric_enroll_no)
// In/Out = 0 -> IN punch, 1 -> OUT punch
// DateTime = local wall-clock (IST) "YYYY-MM-DD HH:MM:SS"

export type ParsedPunch = {
  enNo: string; // raw, e.g. "00000005"
  enNoNorm: string; // normalised, leading zeros stripped, e.g. "5"
  punchType: "IN" | "OUT";
  date: string; // YYYY-MM-DD (IST)
  punchTimeISO: string; // YYYY-MM-DDTHH:MM:SS+05:30
  raw: string;
};

export type ParseResult = {
  punches: ParsedPunch[];
  totalLines: number;
  skipped: number; // non-empty rows that could not be parsed
  headerOk: boolean;
};

function normalizeEnroll(value: string): string {
  const trimmed = value.trim();
  const stripped = trimmed.replace(/^0+/, "");
  return stripped === "" ? "0" : stripped;
}

const ENROLL_COL_NAMES = [
  "EnNo",
  "Enroll",
  "EnrollNo",
  "Enroll Number",
  "Enrollment No",
  "Employee No",
  "Emp No",
  "User ID",
  "UserID",
  "PIN",
  "Card No",
];
const IN_OUT_COL_NAMES = ["In/Out", "InOut", "In_Out", "State", "Check Type", "Punch State", "IO", "Type"];
const DATETIME_COL_NAMES = ["DateTime", "Date Time", "Punch Time", "Clock Time", "Time", "Date"];

function normalizeColName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_./-]+/g, "");
}

function toColumnIndex(headerCols: string[], names: string[]): number {
  for (const n of names) {
    const target = normalizeColName(n);
    const idx = headerCols.findIndex((c) => normalizeColName(c) === target);
    if (idx !== -1) return idx;
  }
  return -1;
}

type SplitLine = (line: string) => string[];

const DELIMITER_STRATEGIES: { name: string; split: SplitLine }[] = [
  { name: "tab", split: (line) => line.split("\t") },
  { name: "comma", split: (line) => line.split(",") },
  { name: "semicolon", split: (line) => line.split(";") },
  { name: "spaces", split: (line) => line.split(/\s{2,}/) },
];

function detectHeader(
  lines: string[]
): { enIdx: number; inOutIdx: number; dtIdx: number; split: SplitLine; headerLine: number } | null {
  const nonEmpty = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() !== "")
    .slice(0, 20);

  for (const { split } of DELIMITER_STRATEGIES) {
    for (const { line, index } of nonEmpty) {
      const cols = split(line);
      const enIdx = toColumnIndex(cols, ENROLL_COL_NAMES);
      const inOutIdx = toColumnIndex(cols, IN_OUT_COL_NAMES);
      const dtIdx = toColumnIndex(cols, DATETIME_COL_NAMES);
      if (enIdx !== -1 && inOutIdx !== -1 && dtIdx !== -1) {
        return { enIdx, inOutIdx, dtIdx, split, headerLine: index };
      }
    }
  }
  return null;
}

function buildPunchTimeISO(dateTime: string): { date: string; iso: string } | null {
  const raw = dateTime.trim();

  // YYYY-MM-DD HH:MM:SS (optionally separated by 'T').
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, yr, mo, da, hh, mm, ss] = m;
    const date = `${yr}-${mo}-${da}`;
    return { date, iso: `${date}T${hh}:${mm}:${ss ?? "00"}+05:30` };
  }

  // DD/MM/YYYY or DD-MM-YYYY with optional time (common on Indian device exports).
  m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, d, mo, yr, hh = "00", mm = "00", ss = "00"] = m;
    const date = `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return { date, iso: `${date}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}+05:30` };
  }

  return null;
}

function parseInOut(value: string): "IN" | "OUT" {
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "out" || v === "checkout" || v === "check out") return "OUT";
  return "IN";
}

export function parseBiometricLog(content: string): ParseResult {
  const text = content.replace(/^\uFEFF/, ""); // strip BOM
  const lines = text.split(/\r?\n/);

  const header = detectHeader(lines);
  const headerOk = header !== null;
  const enIdx = header?.enIdx ?? 2;
  const inOutIdx = header?.inOutIdx ?? 6;
  const dtIdx = header?.dtIdx ?? 9;
  const splitLine = header?.split ?? ((line: string) => line.split("\t"));
  const headerLine = header?.headerLine ?? -1;

  const punches: ParsedPunch[] = [];
  let totalLines = 0;
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.trim() === "") continue;
    if (i === headerLine) continue;

    const cols = splitLine(rawLine);
    totalLines++;

    const enNoRaw = (cols[enIdx] ?? "").trim();
    const inOutRaw = (cols[inOutIdx] ?? "").trim();
    const dtRaw = (cols[dtIdx] ?? "").trim();

    if (!enNoRaw || !dtRaw) {
      skipped++;
      continue;
    }
    const parsedDt = buildPunchTimeISO(dtRaw);
    if (!parsedDt) {
      skipped++;
      continue;
    }

    punches.push({
      enNo: enNoRaw,
      enNoNorm: normalizeEnroll(enNoRaw),
      punchType: parseInOut(inOutRaw),
      date: parsedDt.date,
      punchTimeISO: parsedDt.iso,
      raw: rawLine,
    });
  }

  return { punches, totalLines, skipped, headerOk };
}
