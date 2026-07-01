"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
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
  MapPin,
  Shield,
  BookOpen,
  Heart,
  Building2,
  FileDown,
  Calendar,
  Hash,
  Droplets,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import { PdfIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { createClient } from "@/lib/supabase/client";

const PHOTO_BUCKET = "student-uploads";

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
  aadhar_no?: string;
  pen_no?: string;
  apaar_id?: string;
  udise_id?: string;
  father_name?: string;
  mother_name?: string;
  mother_contact?: string;
  whatsapp_no?: string;
  present_address_line1?: string;
  present_address_line2?: string;
  present_city?: string;
  present_taluka?: string;
  present_district?: string;
  present_state?: string;
  present_pincode?: string;
  present_country?: string;
  last_school?: string;
  previous_school_state_unique_id?: string;
  fee_concession_amount?: number;
  fee_concession_reason?: string;
  height?: string;
  weight?: string;
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

/* ── Helper: load image as base64 for jsPDF ── */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ── PDF Export function ── */
async function exportStudentBioPdf(student: StudentData, schoolName: string, photoUrl: string | null) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { C, drawRoundedRect, drawPageFooter } = await import("@/lib/pdf-theme");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  let y = 12;

  // Pre-load photo image if available
  let photoBase64: string | null = null;
  if (photoUrl) {
    photoBase64 = await loadImageAsBase64(photoUrl);
  }

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

  /* ── Student name banner (taller when photo exists) ── */
  const bannerH = photoBase64 ? 28 : 18;
  drawRoundedRect(doc, marginL, y, contentW, bannerH, 2, C.accent, C.border);

  // Photo or avatar circle
  const avatarX = marginL + 10;
  const avatarY = y + bannerH / 2;
  if (photoBase64) {
    // Draw photo with clipping
    try {
      const imgSize = 18;
      doc.addImage(photoBase64, "JPEG", avatarX - imgSize / 2, y + (bannerH - imgSize) / 2, imgSize, imgSize);
    } catch {
      // Fallback to circle
      doc.setFillColor(...C.primary);
      doc.circle(avatarX, avatarY, 5, "F");
      doc.setTextColor(...C.white);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(student.full_name.charAt(0).toUpperCase(), avatarX, avatarY + 1, { align: "center", baseline: "middle" });
    }
  } else {
    doc.setFillColor(...C.primary);
    doc.circle(avatarX, avatarY, 5, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(student.full_name.charAt(0).toUpperCase(), avatarX, avatarY + 1, { align: "center", baseline: "middle" });
  }

  // Name & GR
  const textStartX = photoBase64 ? marginL + 24 : marginL + 18;
  doc.setTextColor(...C.foreground);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(student.full_name, textStartX, y + (photoBase64 ? 9 : 7));
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.mutedFg);
  const tagParts: string[] = [];
  if (student.gr_number) tagParts.push(`GR No: ${student.gr_number}`);
  if (student.standard) tagParts.push(`Std: ${student.standard}`);
  if (student.division) tagParts.push(`Div: ${student.division}`);
  if (student.roll_number != null) tagParts.push(`Roll: ${student.roll_number}`);
  doc.text(tagParts.join("  •  "), textStartX, y + (photoBase64 ? 15 : 12.5));

  // Status + RTE tags on right
  const statusText = cap(student.status);
  doc.setFontSize(7.5);
  if (student.status === "active") {
    doc.setTextColor(22, 163, 74);
  } else {
    doc.setTextColor(...C.mutedFg);
  }
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageW - marginR - 6, y + (photoBase64 ? 9 : 7), { align: "right" });
  if (student.is_rte_quota) {
    doc.setTextColor(180, 83, 9);
    doc.text("RTE Quota", pageW - marginR - 6, y + (photoBase64 ? 15 : 12), { align: "right" });
  }
  y += bannerH + 4;

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
  ]);

  /* ── 4. Family Information ── */
  sectionHeader("FAMILY INFORMATION");
  drawTable([
    ["Father's Name", student.father_name ?? "—"],
    ["Mother's Name", student.mother_name ?? "—"],
    ["Mother's Contact", student.mother_contact ?? "—"],
    ["WhatsApp No.", student.whatsapp_no ?? "—"],
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

  /* ── 6. Previous School ── */
  const hasPrevSchool = student.last_school || student.previous_school_state_unique_id;
  if (hasPrevSchool) {
    sectionHeader("PREVIOUS SCHOOL");
    drawTable([
      ["Last School", student.last_school ?? "—"],
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [exitInfo, setExitInfo] = useState<{ exit_date?: string | null; exit_reason?: string | null; exit_notes?: string | null } | null>(null);
  const school = useSchoolSettings();
  const supabase = useMemo(() => createClient(), []);

  // Fetch student photo when dialog opens
  useEffect(() => {
    if (!open || !student.id) {
      setPhotoUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: photoRec } = await supabase
        .from("student_photos")
        .select("file_path")
        .eq("student_id", student.id)
        .eq("role", "student")
        .maybeSingle();
      if (cancelled || !photoRec?.file_path) { setPhotoUrl(null); return; }
      const { data: urlData } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(photoRec.file_path, 3600);
      if (!cancelled && urlData?.signedUrl) {
        setPhotoUrl(urlData.signedUrl);
      }
    })();

    // Fetch exit info if inactive
    if (student.status !== "active") {
      (async () => {
        const { data: enrollRec } = await supabase
          .from("student_enrollments")
          .select("exit_date, exit_reason, exit_notes")
          .eq("student_id", student.id)
          .not("status", "eq", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!cancelled) {
          if (enrollRec && enrollRec.exit_date) {
            setExitInfo(enrollRec);
          } else {
            setExitInfo({
              exit_date: student.exit_date,
              exit_reason: student.exit_reason,
              exit_notes: student.exit_notes,
            });
          }
        }
      })();
    } else {
      setExitInfo(null);
    }

    return () => { cancelled = true; };
  }, [open, student.id, student.status, student.exit_date, student.exit_reason, student.exit_notes, supabase]);

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
      await exportStudentBioPdf(student, school.name, photoUrl);
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
            {/* Avatar / Photo */}
            <div className="shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg overflow-hidden">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={student.full_name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {student.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
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
            </div>
          </Section>

          <hr className="border-border/40" />

          {/* ── Family Information ── */}
          <Section icon={Heart} title="Family Information" accent="bg-rose-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Father's Name" value={student.father_name ?? "—"} />
              <InfoRow label="Mother's Name" value={student.mother_name ?? "—"} />
              <InfoRow label="Mother's Contact" value={student.mother_contact ?? "—"} />
              <InfoRow label="WhatsApp No." value={student.whatsapp_no ?? "—"} />
            </div>
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

          {/* ── Previous School ── */}
          {(student.last_school || student.previous_school_state_unique_id) && (
            <>
              <hr className="border-border/40" />
              <Section icon={Building2} title="Previous School">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Last School" value={student.last_school ?? "—"} />
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
          {student.status !== "active" && exitInfo && exitInfo.exit_date && (
            <>
              <hr className="border-border/40" />
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Exit Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow label="Exit Date" value={fmtDate(exitInfo.exit_date)} />
                  <InfoRow label="Reason" value={cap(exitInfo.exit_reason)} />
                  {exitInfo.exit_notes && <InfoRow label="Notes" value={exitInfo.exit_notes} />}
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