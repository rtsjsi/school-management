"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  BookOpen,
  Heart,
  Building2,
  FileDown,
  Calendar,
  Hash,
  Droplets,
  Globe,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import { PdfIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

interface StudentData {
  id: string;
  gr_number?: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  standard?: string;
  division?: string;
  roll_number?: number;
  admission_date?: string;
  status?: string;
  is_rte_quota?: boolean;
  category?: string;
  religion?: string;
  caste?: string;
  mother_tongue?: string;
  second_language?: string;
  birth_place?: string;
  birth_certificate_number?: string;
  aadhar_no?: string;
  pen_no?: string;
  apaar_id?: string;
  udise_id?: string;
  father_name?: string;
  father_education?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_contact?: string;
  mother_education?: string;
  mother_occupation?: string;
  parent_name?: string;
  parent_contact?: string;
  parent_email?: string;
  guardian_name?: string;
  guardian_contact?: string;
  guardian_email?: string;
  guardian_education?: string;
  guardian_occupation?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  whatsapp_no?: string;
  present_address_line1?: string;
  present_address_line2?: string;
  present_city?: string;
  present_taluka?: string;
  present_district?: string;
  present_state?: string;
  present_pincode?: string;
  present_country?: string;
  permanent_address_line1?: string;
  permanent_address_line2?: string;
  permanent_city?: string;
  permanent_taluka?: string;
  permanent_district?: string;
  permanent_state?: string;
  permanent_pincode?: string;
  permanent_country?: string;
  last_school?: string;
  previous_school_address?: string;
  previous_school_state_unique_id?: string;
  fee_concession_amount?: number;
  fee_concession_reason?: string;
  height?: string;
  weight?: string;
  hobby?: string;
  sign_of_identity?: string;
  account_holder_name?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_ifsc?: string;
  account_no?: string;
  exit_date?: string;
  exit_reason?: string;
  exit_notes?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface StudentViewDialogProps {
  student: StudentData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/* ── helpers ── */

function fmtDate(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val + "T12:00:00");
  if (isNaN(d.getTime())) return val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function computeAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return `${years} yrs`;
}

function cap(str?: string | null): string {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildFullAddress(
  line1?: string | null,
  line2?: string | null,
  city?: string | null,
  taluka?: string | null,
  district?: string | null,
  state?: string | null,
  pincode?: string | null,
  country?: string | null
): string {
  const parts = [line1, line2, city, taluka, district, state, pincode, country].filter(
    (p) => p && p.trim()
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

/* ── InfoRow component ── */
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value || value === "—") {
    return (
      <div className="flex items-start gap-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground w-[120px] sm:w-[140px] shrink-0">{label}</span>
        <span className="text-xs text-muted-foreground/40">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs font-medium text-muted-foreground w-[120px] sm:w-[140px] shrink-0">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

/* ── Section component ── */
function Section({
  icon: Icon,
  title,
  children,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${accent ?? "bg-primary/10"}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? "text-white" : "text-primary"}`} />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );
}

/* ── PDF Export function ── */
async function exportStudentBioPdf(student: StudentData, schoolName: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { C, drawRoundedRect, drawPageFooter } = await import("@/lib/pdf-theme");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  let y = 12;

  /* ── Header Banner ── */
  drawRoundedRect(doc, marginL, y, contentW, 22, 2.5, C.primary);
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName || "Student Profile", marginL + 6, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Student Bio / Profile Card", marginL + 6, y + 14);
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${dateStr}`, pageW - marginR - 6, y + 8, { align: "right" });
  y += 26;

  /* ── Student name banner ── */
  drawRoundedRect(doc, marginL, y, contentW, 18, 2, C.accent, C.border);

  // Avatar circle
  const avatarX = marginL + 10;
  const avatarY = y + 9;
  doc.setFillColor(...C.primary);
  doc.circle(avatarX, avatarY, 5, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(student.full_name.charAt(0).toUpperCase(), avatarX, avatarY + 1, { align: "center", baseline: "middle" });

  // Name & GR
  doc.setTextColor(...C.foreground);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(student.full_name, marginL + 18, y + 7);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.mutedFg);
  const tagParts: string[] = [];
  if (student.gr_number) tagParts.push(`GR No: ${student.gr_number}`);
  if (student.standard) tagParts.push(`Std: ${student.standard}`);
  if (student.division) tagParts.push(`Div: ${student.division}`);
  if (student.roll_number != null) tagParts.push(`Roll: ${student.roll_number}`);
  doc.text(tagParts.join("  •  "), marginL + 18, y + 12.5);

  // Status + RTE tags on right
  const statusText = cap(student.status);
  doc.setFontSize(7.5);
  if (student.status === "active") {
    doc.setTextColor(22, 163, 74);
  } else {
    doc.setTextColor(...C.mutedFg);
  }
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageW - marginR - 6, y + 7, { align: "right" });
  if (student.is_rte_quota) {
    doc.setTextColor(180, 83, 9);
    doc.text("RTE Quota", pageW - marginR - 6, y + 12, { align: "right" });
  }
  y += 22;

  /* ── Utility: draw section ── */
  const sectionHeader = (title: string) => {
    if (y > 260) { doc.addPage(); y = 14; }
    drawRoundedRect(doc, marginL, y, contentW, 7, 1.5, C.secondary, C.border);
    doc.setFontSize(8);
    doc.setTextColor(...C.primary);
    doc.setFont("helvetica", "bold");
    doc.text(title, marginL + 4, y + 5);
    y += 10;
  };

  const drawTable = (rows: [string, string][]) => {
    const filteredRows = rows.filter(([, v]) => v && v !== "—");
    if (filteredRows.length === 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(...C.mutedFg);
      doc.text("No data available", marginL + 4, y + 2);
      y += 6;
      return;
    }

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      body: filteredRows,
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
        font: "helvetica",
        textColor: C.foreground,
        lineWidth: 0,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold", textColor: C.mutedFg, fontSize: 7.5 },
        1: { textColor: C.foreground },
      },
      alternateRowStyles: { fillColor: C.background },
      didDrawPage: () => {},
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 3;
  };

  /* ── 1. Personal Information ── */
  sectionHeader("PERSONAL INFORMATION");
  drawTable([
    ["Full Name", student.full_name],
    ["Date of Birth", fmtDate(student.date_of_birth)],
    ["Age", computeAge(student.date_of_birth)],
    ["Gender", cap(student.gender)],
    ["Blood Group", student.blood_group ?? "—"],
    ["Birth Place", student.birth_place ?? "—"],
    ["Mother Tongue", cap(student.mother_tongue)],
    ["Second Language", cap(student.second_language)],
    ["Category", cap(student.category)],
    ["Religion", cap(student.religion)],
    ["Caste", cap(student.caste)],
    ["Height", student.height ?? "—"],
    ["Weight", student.weight ?? "—"],
    ["Hobby", cap(student.hobby)],
    ["Sign of Identity", student.sign_of_identity ?? "—"],
  ]);

  /* ── 2. Academic Information ── */
  sectionHeader("ACADEMIC INFORMATION");
  drawTable([
    ["GR Number", student.gr_number ?? "—"],
    ["Standard", student.standard ?? "—"],
    ["Division", student.division ?? "—"],
    ["Roll Number", student.roll_number != null ? String(student.roll_number) : "—"],
    ["Admission Date", fmtDate(student.admission_date)],
    ["Status", cap(student.status)],
    ["RTE Quota", student.is_rte_quota ? "Yes" : "No"],
    ["Fee Concession", student.fee_concession_amount ? `₹${student.fee_concession_amount}` : "—"],
    ["Concession Reason", student.fee_concession_reason ?? "—"],
  ]);

  /* ── 3. Identity Documents ── */
  sectionHeader("IDENTITY DOCUMENTS");
  drawTable([
    ["Aadhar Number", student.aadhar_no ?? "—"],
    ["PEN Number", student.pen_no ?? "—"],
    ["APAAR ID", student.apaar_id ?? "—"],
    ["UDISE ID", student.udise_id ?? "—"],
    ["Birth Certificate No.", student.birth_certificate_number ?? "—"],
  ]);

  /* ── 4. Family Information ── */
  sectionHeader("FAMILY INFORMATION");
  drawTable([
    ["Father's Name", student.father_name ?? "—"],
    ["Father's Education", student.father_education ?? "—"],
    ["Father's Occupation", student.father_occupation ?? "—"],
    ["Mother's Name", student.mother_name ?? "—"],
    ["Mother's Contact", student.mother_contact ?? "—"],
    ["Mother's Education", student.mother_education ?? "—"],
    ["Mother's Occupation", student.mother_occupation ?? "—"],
    ["Parent/Guardian", student.parent_name ?? "—"],
    ["Parent Contact", student.parent_contact ?? "—"],
    ["Parent Email", student.parent_email ?? "—"],
    ["WhatsApp No.", student.whatsapp_no ?? "—"],
    ["Guardian Name", student.guardian_name ?? "—"],
    ["Guardian Contact", student.guardian_contact ?? "—"],
    ["Guardian Email", student.guardian_email ?? "—"],
    ["Guardian Education", student.guardian_education ?? "—"],
    ["Guardian Occupation", student.guardian_occupation ?? "—"],
    ["Emergency Contact", student.emergency_contact_name ?? "—"],
    ["Emergency Phone", student.emergency_contact_number ?? "—"],
  ]);

  /* ── 5. Address ── */
  sectionHeader("PRESENT ADDRESS");
  const presentAddr = buildFullAddress(
    student.present_address_line1, student.present_address_line2,
    student.present_city, student.present_taluka,
    student.present_district, student.present_state,
    student.present_pincode, student.present_country
  );
  drawTable([
    ["Address Line 1", student.present_address_line1 ?? "—"],
    ["Address Line 2", student.present_address_line2 ?? "—"],
    ["City", student.present_city ?? "—"],
    ["Taluka", student.present_taluka ?? "—"],
    ["District", student.present_district ?? "—"],
    ["State", student.present_state ?? "—"],
    ["Pincode", student.present_pincode ?? "—"],
    ["Country", student.present_country ?? "India"],
  ]);

  const hasPermanent = student.permanent_address_line1 || student.permanent_city || student.permanent_state;
  if (hasPermanent) {
    sectionHeader("PERMANENT ADDRESS");
    drawTable([
      ["Address Line 1", student.permanent_address_line1 ?? "—"],
      ["Address Line 2", student.permanent_address_line2 ?? "—"],
      ["City", student.permanent_city ?? "—"],
      ["Taluka", student.permanent_taluka ?? "—"],
      ["District", student.permanent_district ?? "—"],
      ["State", student.permanent_state ?? "—"],
      ["Pincode", student.permanent_pincode ?? "—"],
      ["Country", student.permanent_country ?? "India"],
    ]);
  }

  /* ── 6. Previous School ── */
  const hasPrevSchool = student.last_school || student.previous_school_address;
  if (hasPrevSchool) {
    sectionHeader("PREVIOUS SCHOOL");
    drawTable([
      ["Last School", student.last_school ?? "—"],
      ["School Address", student.previous_school_address ?? "—"],
      ["State Unique ID", student.previous_school_state_unique_id ?? "—"],
    ]);
  }

  /* ── 7. Bank Details ── */
  const hasBank = student.bank_name || student.account_no;
  if (hasBank) {
    sectionHeader("BANK DETAILS");
    drawTable([
      ["Account Holder", student.account_holder_name ?? "—"],
      ["Bank Name", student.bank_name ?? "—"],
      ["Branch", student.bank_branch ?? "—"],
      ["IFSC Code", student.bank_ifsc ?? "—"],
      ["Account Number", student.account_no ?? "—"],
    ]);
  }

  /* ── Footer on all pages ── */
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(
      doc,
      { schoolName, reportTitle: "Student Profile" },
      marginL, marginR, contentW, p
    );
  }

  const safeName = student.full_name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
  doc.save(`Student_Bio_${safeName}.pdf`);
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */

export function StudentViewDialog({ student, open: controlledOpen, onOpenChange: controlledOnOpenChange }: StudentViewDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen;
  const [exporting, setExporting] = useState(false);
  const school = useSchoolSettings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800";
      case "inactive": return "bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:text-zinc-400";
      case "transferred": return "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400";
      case "graduated": return "bg-violet-500/10 text-violet-600 border-violet-200 dark:text-violet-400";
      case "suspended": return "bg-red-500/10 text-red-600 border-red-200 dark:text-red-400";
      default: return "bg-zinc-500/10 text-zinc-600 border-zinc-200";
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportStudentBioPdf(student, school.name);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const age = computeAge(student.date_of_birth);
  const presentAddress = buildFullAddress(
    student.present_address_line1, student.present_address_line2,
    student.present_city, student.present_taluka,
    student.present_district, student.present_state,
    student.present_pincode, student.present_country
  );
  const permanentAddress = buildFullAddress(
    student.permanent_address_line1, student.permanent_address_line2,
    student.permanent_city, student.permanent_taluka,
    student.permanent_district, student.permanent_state,
    student.permanent_pincode, student.permanent_country
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <Eye className="h-3 w-3" />
            View
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[92vh] overflow-y-auto max-w-[95vw] sm:max-w-3xl p-0">
        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,.08),transparent_70%)]" />
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-10 -translate-x-6" />

          <DialogHeader className="relative z-10">
            <DialogTitle className="sr-only">Student Profile — {student.full_name}</DialogTitle>
            <DialogDescription className="sr-only">Detailed bio for {student.full_name}</DialogDescription>
          </DialogHeader>

          <div className="relative z-10 flex items-start gap-4">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {student.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Name & quick info */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
                {student.full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-white/70 text-xs sm:text-sm">
                {student.gr_number && (
                  <span className="bg-white/10 rounded-md px-2 py-0.5 font-mono text-white/80 text-[11px]">
                    GR: {student.gr_number}
                  </span>
                )}
                {student.standard && (
                  <span className="bg-white/10 rounded-md px-2 py-0.5 text-[11px]">
                    {student.standard} {student.division ? `- ${student.division}` : ""}
                  </span>
                )}
                {student.roll_number != null && (
                  <span className="bg-white/10 rounded-md px-2 py-0.5 text-[11px]">
                    Roll #{student.roll_number}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge className={`text-[10px] sm:text-[11px] font-semibold capitalize border ${getStatusColor(student.status ?? "active")}`}>
                  {student.status ?? "active"}
                </Badge>
                {student.is_rte_quota && (
                  <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-transparent text-[10px] sm:text-[11px] font-bold shadow-sm">
                    RTE Quota
                  </Badge>
                )}
                {student.gender && (
                  <span className="text-white/60 text-[11px] capitalize">{student.gender}</span>
                )}
                {age && (
                  <span className="text-white/60 text-[11px]">{age}</span>
                )}
              </div>
            </div>
          </div>

          {/* Export button */}
          <div className="absolute top-4 right-4 z-20 sm:top-5 sm:right-6">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-white/80 hover:text-white hover:bg-white/15 text-xs h-8 px-3"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {exporting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* ── Content Body ── */}
        <div className="px-5 py-5 sm:px-7 sm:py-6 space-y-6">

          {/* ── Personal Information ── */}
          <Section icon={User} title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Date of Birth" value={fmtDate(student.date_of_birth)} />
              <InfoRow label="Age" value={age || "—"} />
              <InfoRow label="Gender" value={cap(student.gender)} />
              <InfoRow label="Blood Group" value={student.blood_group ?? "—"} />
              <InfoRow label="Birth Place" value={student.birth_place ?? "—"} />
              <InfoRow label="Mother Tongue" value={cap(student.mother_tongue)} />
              <InfoRow label="Second Language" value={cap(student.second_language)} />
              <InfoRow label="Category" value={cap(student.category)} />
              <InfoRow label="Religion" value={cap(student.religion)} />
              <InfoRow label="Caste" value={cap(student.caste)} />
              <InfoRow label="Height" value={student.height ?? "—"} />
              <InfoRow label="Weight" value={student.weight ?? "—"} />
              <InfoRow label="Hobby" value={cap(student.hobby)} />
              <InfoRow label="Sign of Identity" value={student.sign_of_identity ?? "—"} />
            </div>
          </Section>

          <hr className="border-border/40" />

          {/* ── Academic Information ── */}
          <Section icon={GraduationCap} title="Academic Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="GR Number" value={student.gr_number ?? "—"} mono />
              <InfoRow label="Standard" value={student.standard ?? "—"} />
              <InfoRow label="Division" value={student.division ?? "—"} />
              <InfoRow label="Roll Number" value={student.roll_number != null ? String(student.roll_number) : "—"} />
              <InfoRow label="Admission Date" value={fmtDate(student.admission_date)} />
              <InfoRow label="Status" value={cap(student.status)} />
              <InfoRow label="RTE Quota" value={student.is_rte_quota ? "Yes" : "No"} />
              {student.fee_concession_amount ? (
                <>
                  <InfoRow label="Fee Concession" value={`₹${student.fee_concession_amount}`} />
                  <InfoRow label="Concession Reason" value={student.fee_concession_reason ?? "—"} />
                </>
              ) : null}
            </div>
          </Section>

          <hr className="border-border/40" />

          {/* ── Identity Documents ── */}
          <Section icon={Shield} title="Identity Documents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Aadhar Number" value={student.aadhar_no ?? "—"} mono />
              <InfoRow label="PEN Number" value={student.pen_no ?? "—"} mono />
              <InfoRow label="APAAR ID" value={student.apaar_id ?? "—"} mono />
              <InfoRow label="UDISE ID" value={student.udise_id ?? "—"} mono />
              <InfoRow label="Birth Cert. No." value={student.birth_certificate_number ?? "—"} mono />
            </div>
          </Section>

          <hr className="border-border/40" />

          {/* ── Family Information ── */}
          <Section icon={Heart} title="Family Information" accent="bg-rose-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Father's Name" value={student.father_name ?? "—"} />
              <InfoRow label="Father's Education" value={student.father_education ?? "—"} />
              <InfoRow label="Father's Occupation" value={student.father_occupation ?? "—"} />
              <InfoRow label="Mother's Name" value={student.mother_name ?? "—"} />
              <InfoRow label="Mother's Contact" value={student.mother_contact ?? "—"} />
              <InfoRow label="Mother's Education" value={student.mother_education ?? "—"} />
              <InfoRow label="Mother's Occupation" value={student.mother_occupation ?? "—"} />
            </div>
          </Section>

          <hr className="border-border/40" />

          {/* ── Contact Information ── */}
          <Section icon={Phone} title="Contact Information" accent="bg-blue-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Parent/Guardian" value={student.parent_name ?? "—"} />
              <InfoRow label="Parent Contact" value={student.parent_contact ?? "—"} />
              <InfoRow label="Parent Email" value={student.parent_email ?? "—"} />
              <InfoRow label="WhatsApp No." value={student.whatsapp_no ?? "—"} />
              <InfoRow label="Guardian Name" value={student.guardian_name ?? "—"} />
              <InfoRow label="Guardian Contact" value={student.guardian_contact ?? "—"} />
              <InfoRow label="Guardian Email" value={student.guardian_email ?? "—"} />
              <InfoRow label="Guardian Education" value={student.guardian_education ?? "—"} />
              <InfoRow label="Guardian Occupation" value={student.guardian_occupation ?? "—"} />
            </div>
            {(student.emergency_contact_name || student.emergency_contact_number) && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Emergency Contact</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Name" value={student.emergency_contact_name ?? "—"} />
                  <InfoRow label="Phone" value={student.emergency_contact_number ?? "—"} />
                </div>
              </div>
            )}
          </Section>

          <hr className="border-border/40" />

          {/* ── Present Address ── */}
          <Section icon={MapPin} title="Present Address" accent="bg-emerald-500">
            {presentAddress !== "—" ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm leading-relaxed">{presentAddress}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/50">No address on record</p>
            )}
          </Section>

          {/* ── Permanent Address ── */}
          {permanentAddress !== "—" && permanentAddress !== presentAddress && (
            <>
              <hr className="border-border/40" />
              <Section icon={Globe} title="Permanent Address" accent="bg-teal-500">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm leading-relaxed">{permanentAddress}</p>
                </div>
              </Section>
            </>
          )}

          {/* ── Previous School ── */}
          {(student.last_school || student.previous_school_address) && (
            <>
              <hr className="border-border/40" />
              <Section icon={Building2} title="Previous School">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Last School" value={student.last_school ?? "—"} />
                  <InfoRow label="School Address" value={student.previous_school_address ?? "—"} />
                  <InfoRow label="State Unique ID" value={student.previous_school_state_unique_id ?? "—"} mono />
                </div>
              </Section>
            </>
          )}

          {/* ── Bank Details ── */}
          {(student.bank_name || student.account_no) && (
            <>
              <hr className="border-border/40" />
              <Section icon={Landmark} title="Bank Details" accent="bg-violet-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Account Holder" value={student.account_holder_name ?? "—"} />
                  <InfoRow label="Bank Name" value={student.bank_name ?? "—"} />
                  <InfoRow label="Branch" value={student.bank_branch ?? "—"} />
                  <InfoRow label="IFSC Code" value={student.bank_ifsc ?? "—"} mono />
                  <InfoRow label="Account Number" value={student.account_no ?? "—"} mono />
                </div>
              </Section>
            </>
          )}

          {/* ── Exit Info (if inactive) ── */}
          {student.status === "inactive" && student.exit_date && (
            <>
              <hr className="border-border/40" />
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Exit Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Exit Date" value={fmtDate(student.exit_date)} />
                  <InfoRow label="Reason" value={cap(student.exit_reason)} />
                  {student.exit_notes && <InfoRow label="Notes" value={student.exit_notes} />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 border-t px-5 py-3 sm:px-7 sm:py-4 bg-muted/20">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            <PdfIcon className="h-4 w-4" />
            {exporting ? "Exporting…" : "Download PDF"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen?.(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}