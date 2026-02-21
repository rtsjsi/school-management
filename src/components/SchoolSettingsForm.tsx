"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSchoolSettings } from "@/app/dashboard/school-settings/actions";
import { Building2, ImageIcon, FileSignature } from "lucide-react";

const BUCKET = "school-assets";
const LOGO_PATH = "logo.png";
const SIGNATURE_PATH = "principal-signature.png";

type SettingsWithUrls = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_path: string | null;
  principal_signature_path: string | null;
  logoUrl: string | null;
  principalSignatureUrl: string | null;
};

export function SchoolSettingsForm({
  initialSettings,
  isPrincipal,
}: {
  initialSettings: SettingsWithUrls | null;
  isPrincipal: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: initialSettings?.name ?? "School",
    address: initialSettings?.address ?? "",
    phone: initialSettings?.phone ?? "",
    email: initialSettings?.email ?? "",
  });
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialSettings?.logoUrl ?? null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    initialSettings?.principalSignatureUrl ?? null
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: initialSettings?.name ?? "School",
      address: initialSettings?.address ?? "",
      phone: initialSettings?.phone ?? "",
      email: initialSettings?.email ?? "",
    });
    setLogoPreview(initialSettings?.logoUrl ?? null);
    setSignaturePreview(initialSettings?.principalSignatureUrl ?? null);
  }, [initialSettings]);

  const supabase = createClient();

  const uploadFile = async (file: File, path: string): Promise<boolean> => {
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    return !uploadErr;
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const ok = await uploadFile(file, LOGO_PATH);
      if (ok) {
        setLogoPath(LOGO_PATH);
        const url = supabase.storage.from(BUCKET).getPublicUrl(LOGO_PATH).data.publicUrl;
        setLogoPreview(url + "?t=" + Date.now());
      } else {
        setError("Logo upload failed.");
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingSignature(true);
    setError(null);
    try {
      const ok = await uploadFile(file, SIGNATURE_PATH);
      if (ok) {
        setSignaturePath(SIGNATURE_PATH);
        const url = supabase.storage.from(BUCKET).getPublicUrl(SIGNATURE_PATH).data.publicUrl;
        setSignaturePreview(url + "?t=" + Date.now());
      } else {
        setError("Signature upload failed.");
      }
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    const result = await updateSchoolSettings(
      {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        logo_path: logoPath ?? initialSettings?.logo_path ?? null,
        principal_signature_path: signaturePath ?? initialSettings?.principal_signature_path ?? null,
      },
      isPrincipal
    );
    if (result.ok) {
      setSuccess(true);
      setLogoPath(null);
      setSignaturePath(null);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  if (!isPrincipal) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Only Principal can access school settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}
      {success && (
        <p className="text-sm text-primary bg-primary/10 p-2 rounded-md">School settings saved.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School information
          </CardTitle>
          <CardDescription>
            Name, address, and contact. Used on receipts, report cards, and letterheads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">School name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="School name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Address, city, state, PIN"
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="school@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Logo
          </CardTitle>
          <CardDescription>
            School logo shown on receipts and report cards. Use a square or landscape image (JPEG/PNG).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {logoPreview && (
              <div className="w-32 h-32 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img src={logoPreview} alt="School logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="logo">Upload logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
              />
              {uploadingLogo && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Principal signature
          </CardTitle>
          <CardDescription>
            Signature image used on certificates and official documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {signaturePreview && (
              <div className="w-48 h-20 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={signaturePreview}
                  alt="Principal signature"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="signature">Upload signature image</Label>
              <Input
                id="signature"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSignatureChange}
                disabled={uploadingSignature}
              />
              {uploadingSignature && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <SubmitButton loading={saving} loadingLabel="Saving…">Save school settings</SubmitButton>
    </form>
  );
}
