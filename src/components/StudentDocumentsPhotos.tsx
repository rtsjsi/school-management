"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraCaptureButton } from "@/components/CameraCapture";
import { Upload, X, FileText, ImageIcon } from "lucide-react";

const BUCKET = "student-uploads";
const PHOTO_ROLES = ["student"] as const;
const PHOTO_LABELS: Record<(typeof PHOTO_ROLES)[number], string> = {
  student: "Student",
};

const DOC_TYPES = [
  "admission_form",
  "leaving_cert",
  "birth_cert",
  "aadhar",
  "caste_cert",
  "other",
] as const;
const DOC_LABELS: Record<(typeof DOC_TYPES)[number], string> = {
  admission_form: "Admission form",
  leaving_cert: "Leaving certificate",
  birth_cert: "Birth certificate",
  aadhar: "Aadhar card",
  caste_cert: "Caste certificate",
  other: "Other document",
};

type PhotoRecord = { role: string; file_path: string };
type DocRecord = { document_type: string; file_path: string };

export function StudentDocumentsPhotos({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      setLoading(true);
      setError(null);
      const [photosRes, docsRes] = await Promise.all([
        supabase.from("student_photos").select("role, file_path").eq("student_id", studentId),
        supabase.from("student_documents").select("document_type, file_path").eq("student_id", studentId),
      ]);
      setPhotos((photosRes.data ?? []) as PhotoRecord[]);
      setDocuments((docsRes.data ?? []) as DocRecord[]);
      setLoading(false);
    })();
  }, [studentId]);

  useEffect(() => {
    if (!studentId || (photos.length === 0 && documents.length === 0)) return;
    const paths = [
      ...photos.map((p) => p.file_path),
      ...documents.map((d) => d.file_path),
    ];
    (async () => {
      const next: Record<string, string> = {};
      for (const path of paths) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (data?.signedUrl) next[path] = data.signedUrl;
      }
      setSignedUrls((prev) => ({ ...prev, ...next }));
    })();
  }, [studentId, photos, documents]);

  const getExt = (file: File) => {
    const n = file.name.toLowerCase();
    if (n.endsWith(".png")) return "png";
    if (n.endsWith(".webp")) return "webp";
    if (n.endsWith(".gif")) return "gif";
    return "jpg";
  };

  const uploadPhoto = async (role: (typeof PHOTO_ROLES)[number], file: File) => {
    setError(null);
    setUploading(`photo-${role}`);
    const ext = getExt(file);
    const path = `photos/${studentId}/${role}.${ext}`;
    try {
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadErr) throw uploadErr;
      await supabase.from("student_photos").upsert(
        { student_id: studentId, role, file_path: path, updated_at: new Date().toISOString() },
        { onConflict: "student_id,role" }
      );
      router.refresh();
      setPhotos((prev) => {
        const rest = prev.filter((p) => p.role !== role);
        return [...rest, { role, file_path: path }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const removePhoto = async (role: string) => {
    const rec = photos.find((p) => p.role === role);
    if (!rec) return;
    setError(null);
    await supabase.storage.from(BUCKET).remove([rec.file_path]);
    await supabase.from("student_photos").delete().eq("student_id", studentId).eq("role", role);
    router.refresh();
    setPhotos((prev) => prev.filter((p) => p.role !== role));
    setSignedUrls((prev) => {
      const next = { ...prev };
      delete next[rec.file_path];
      return next;
    });
  };

  const uploadDocument = async (documentType: (typeof DOC_TYPES)[number], file: File) => {
    setError(null);
    setUploading(`doc-${documentType}`);
    const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : getExt(file);
    const path = `documents/${studentId}/${documentType}.${ext}`;
    try {
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadErr) throw uploadErr;
      await supabase.from("student_documents").upsert(
        { student_id: studentId, document_type: documentType, file_path: path },
        { onConflict: "student_id,document_type" }
      );
      router.refresh();
      setDocuments((prev) => {
        const rest = prev.filter((d) => d.document_type !== documentType);
        return [...rest, { document_type: documentType, file_path: path }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const removeDocument = async (documentType: string) => {
    const rec = documents.find((d) => d.document_type === documentType);
    if (!rec) return;
    setError(null);
    await supabase.storage.from(BUCKET).remove([rec.file_path]);
    await supabase.from("student_documents").delete().eq("student_id", studentId).eq("document_type", documentType);
    router.refresh();
    setDocuments((prev) => prev.filter((d) => d.document_type !== documentType));
    setSignedUrls((prev) => {
      const next = { ...prev };
      delete next[rec.file_path];
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents &amp; Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents &amp; Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        <div>
          <Label className="text-sm font-medium mb-2 block">Photos</Label>
          <p className="text-xs text-muted-foreground mb-3">Student photo (image only)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PHOTO_ROLES.map((role) => {
              const rec = photos.find((p) => p.role === role);
              const url = rec ? signedUrls[rec.file_path] : null;
              const isUploading = uploading === `photo-${role}`;
              return (
                <div key={role} className="border rounded-lg p-3 flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {url ? (
                      <img src={url} alt={PHOTO_LABELS[role]} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{PHOTO_LABELS[role]}</span>
                  <div className="flex flex-wrap gap-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadPhoto(role, f);
                          e.target.value = "";
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                        <span>
                          <Upload className="h-3 w-3" />
                          {rec ? "Replace" : "Upload"}
                        </span>
                      </Button>
                    </label>
                    {role === "student" && (
                      <CameraCaptureButton onCapture={(file) => uploadPhoto("student", file)} disabled={!!isUploading} />
                    )}
                    {rec && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removePhoto(role)}
                        disabled={isUploading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {isUploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Documents</Label>
          <p className="text-xs text-muted-foreground mb-3">PDF or image</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DOC_TYPES.map((docType) => {
              const rec = documents.find((d) => d.document_type === docType);
              const url = rec ? signedUrls[rec.file_path] : null;
              const isUploading = uploading === `doc-${docType}`;
              return (
                <div
                  key={docType}
                  className="flex items-center justify-between rounded-md border p-2 gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{DOC_LABELS[docType]}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDocument(docType, f);
                          e.target.value = "";
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                        <span>
                          <Upload className="h-3 w-3" />
                          {rec ? "Replace" : "Upload"}
                        </span>
                      </Button>
                    </label>
                    {rec && (
                      <>
                        {url && (
                          <Button type="button" size="sm" variant="ghost" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeDocument(docType)}
                          disabled={isUploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  {isUploading && (
                    <span className="text-xs text-muted-foreground shrink-0">Uploading…</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
