"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AcademicYearOption } from "@/lib/lov";

export function ExamYearFilter({ years }: { years: AcademicYearOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("academic_year_id") ?? "";

  const handleChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== "_all") next.set("academic_year_id", value);
    else next.delete("academic_year_id");
    router.push(`/dashboard/exams?${next.toString()}`);
  };

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">Academic year</Label>
      <Select value={current || "_all"} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All years" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All years</SelectItem>
          {years.map((ay) => (
            <SelectItem key={ay.id} value={ay.id}>
              {ay.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
