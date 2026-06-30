"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImportResult = {
  fileName: string;
  totalRows: number;
  imported: number;
  duplicates: { rowNumber: number; full_name: string; reason: string }[];
  failed: { rowNumber: number; full_name: string; reason: string }[];
  skipped: { rowNumber: number; reason: string }[];
  inserted: { rowNumber: number; full_name: string; employee_id: string }[];
};

export default function EmployeeImport() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Please choose a staff spreadsheet (.xlsx).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/employee-import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setResult(json as ImportResult);
      toast({
        title: "Staff imported",
        description: `${json.imported} employee record(s) added to the master.`,
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast({ variant: "destructive", title: "Import failed", description: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Import staff from spreadsheet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload the staff template (.xlsx) to bulk-create employee master records. Rows are matched by
            email or Aadhaar — duplicates are skipped. Bank and salary columns are optional if not yet
            available.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Staff spreadsheet</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-[280px]"
            />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="gap-1.5">
            <UploadCloud className="h-4 w-4" />
            {uploading ? "Importing…" : "Upload & Import"}
          </Button>
          <Button variant="outline" size="default" className="gap-1.5" asChild>
            <a href="/staff_data_template.csv" download>
              <Download className="h-4 w-4" />
              Download template
            </a>
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-md">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="text-sm">
                Imported <span className="font-semibold">{result.imported}</span> of{" "}
                <span className="font-semibold">{result.totalRows}</span> row(s) from{" "}
                <span className="font-medium">{result.fileName}</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Imported" value={result.imported} />
              <Stat label="Duplicates skipped" value={result.duplicates.length} />
              <Stat label="Failed" value={result.failed.length} />
              <Stat label="Invalid rows" value={result.skipped.length} />
            </div>

            {(result.duplicates.length > 0 || result.failed.length > 0) && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">Some rows were not imported</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {[...result.duplicates, ...result.failed].map((item) => (
                    <p key={`${item.rowNumber}-${item.full_name}`}>
                      Row {item.rowNumber}: {item.full_name} — {item.reason}
                    </p>
                  ))}
                  {result.skipped.map((item) => (
                    <p key={`skip-${item.rowNumber}`}>
                      Row {item.rowNumber}: {item.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.inserted.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.inserted.map((row) => (
                  <Badge key={row.employee_id} variant="secondary">
                    {row.employee_id}: {row.full_name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
