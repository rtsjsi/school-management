"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImportResult = {
  monthYear: string;
  fileName: string;
  totalParsed: number;
  skippedRows: number;
  punchesInFile: number;
  punchesOutsideMonth: number;
  punchesInMonth: number;
  punchesUpserted: number;
  mappedEmployees: number;
  dailyWritten: number;
  unmapped: { enNo: string; count: number }[];
};

export default function AttendanceImport() {
  const { toast } = useToast();
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Please choose a biometric log file (.txt).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("monthYear", monthYear);
      fd.append("file", file);
      const res = await fetch("/api/attendance-import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setResult(json as ImportResult);
      toast({
        title: "Attendance imported",
        description: `${json.punchesUpserted} punches for ${json.mappedEmployees} employees recorded.`,
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
          <h3 className="text-sm font-semibold">Import biometric attendance</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload the full attendance log from the biometric machine — it can contain records from all
            months since the device was installed. Only punches within the selected payroll month are
            imported. Punches are matched to employees by their{" "}
            <span className="font-medium">Biometric Enrollment No</span>. Re-uploading the same file is safe.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Payroll Month</Label>
            <Input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} className="w-[180px]" />
          </div>
          <div className="space-y-2">
            <Label>Biometric Log File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".txt,.dat,.log,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-[260px]"
            />
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="gap-1.5">
            <UploadCloud className="h-4 w-4" />
            {uploading ? "Importing…" : "Upload & Process"}
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
                Imported <span className="font-semibold">{result.punchesUpserted}</span> punches for{" "}
                <span className="font-semibold">{result.mappedEmployees}</span> employees ·{" "}
                <span className="font-semibold">{result.dailyWritten}</span> day(s) updated.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <Stat label="Rows in file" value={result.punchesInFile} />
              <Stat label="In selected month" value={result.punchesInMonth} />
              <Stat label="Other months (ignored)" value={result.punchesOutsideMonth} />
              <Stat label="Imported punches" value={result.punchesUpserted} />
              <Stat label="Mapped employees" value={result.mappedEmployees} />
              <Stat label="Skipped rows" value={result.skippedRows} />
            </div>

            {result.unmapped.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {result.unmapped.length} enrollment number(s) could not be matched to an employee
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Set the matching Biometric Enrollment No on these employees (Staff tab) and re-upload to
                  capture their attendance.
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.unmapped.map((u) => (
                    <Badge key={u.enNo} variant="secondary" className="font-mono">
                      {u.enNo} ({u.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Review and adjust the imported attendance in the <span className="font-medium">Review</span> tab,
              then approve the month before generating the NEFT file.
            </p>
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
