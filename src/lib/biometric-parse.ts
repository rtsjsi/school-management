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

function toColumnIndex(headerCols: string[], names: string[]): number {
  for (const n of names) {
    const idx = headerCols.findIndex((c) => c.trim().toLowerCase() === n.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function buildPunchTimeISO(dateTime: string): { date: string; iso: string } | null {
  // Expect "YYYY-MM-DD HH:MM:SS" (optionally separated by 'T').
  const m = dateTime.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, yr, mo, da, hh, mm, ss] = m;
  const date = `${yr}-${mo}-${da}`;
  const iso = `${date}T${hh}:${mm}:${ss ?? "00"}+05:30`;
  return { date, iso };
}

export function parseBiometricLog(content: string): ParseResult {
  const text = content.replace(/^\uFEFF/, ""); // strip BOM
  const lines = text.split(/\r?\n/);

  let headerCols: string[] | null = null;
  let enIdx = 2;
  let inOutIdx = 6;
  let dtIdx = 9;
  let headerOk = false;

  const punches: ParsedPunch[] = [];
  let totalLines = 0;
  let skipped = 0;

  for (const rawLine of lines) {
    if (rawLine.trim() === "") continue;
    const cols = rawLine.split("\t");

    if (!headerCols) {
      // First non-empty line is the header.
      headerCols = cols;
      const e = toColumnIndex(cols, ["EnNo", "Enroll", "EnrollNo"]);
      const io = toColumnIndex(cols, ["In/Out", "InOut", "In_Out"]);
      const dt = toColumnIndex(cols, ["DateTime", "Date Time", "Time"]);
      if (e !== -1 && io !== -1 && dt !== -1) {
        enIdx = e;
        inOutIdx = io;
        dtIdx = dt;
        headerOk = true;
      }
      continue;
    }

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

    const punchType: "IN" | "OUT" = inOutRaw === "1" ? "OUT" : "IN";

    punches.push({
      enNo: enNoRaw,
      enNoNorm: normalizeEnroll(enNoRaw),
      punchType,
      date: parsedDt.date,
      punchTimeISO: parsedDt.iso,
      raw: rawLine,
    });
  }

  return { punches, totalLines, skipped, headerOk };
}
