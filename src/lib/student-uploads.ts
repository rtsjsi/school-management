import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "student-uploads";

const PHOTO_ROLES = ["student"] as const;
const DOC_TYPES = [
  "admission_form",
  "leaving_cert",
  "birth_cert",
  "aadhar",
  "caste_cert",
  "other",
] as const;

export type PendingPhotos = Partial<Record<(typeof PHOTO_ROLES)[number], File>>;
export type PendingDocuments = Partial<Record<(typeof DOC_TYPES)[number], File>>;

function getExt(file: File) {
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".gif")) return "gif";
  return "jpg";
}

export async function uploadStudentFiles(
  supabase: SupabaseClient,
  studentId: string,
  photos: PendingPhotos,
  documents: PendingDocuments
): Promise<{ error?: string }> {
  try {
    for (const role of PHOTO_ROLES) {
      const file = photos[role];
      if (!file) continue;
      const ext = getExt(file);
      const path = `photos/${studentId}/${role}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadErr) return { error: uploadErr.message };
      await supabase.from("student_photos").upsert(
        { student_id: studentId, role, file_path: path, updated_at: new Date().toISOString() },
        { onConflict: "student_id,role" }
      );
    }

    for (const docType of DOC_TYPES) {
      const file = documents[docType];
      if (!file) continue;
      const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : getExt(file);
      const path = `documents/${studentId}/${docType}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadErr) return { error: uploadErr.message };
      await supabase.from("student_documents").upsert(
        { student_id: studentId, document_type: docType, file_path: path },
        { onConflict: "student_id,document_type" }
      );
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}
