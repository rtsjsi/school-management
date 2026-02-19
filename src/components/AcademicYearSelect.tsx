"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAcademicYears } from "@/lib/lov";

interface AcademicYearSelectProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  label?: string;
}

export function AcademicYearSelect({ value, onChange, id = "academic_year", label = "Academic year" }: AcademicYearSelectProps) {
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchAcademicYears().then(setYears);
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || " "} onValueChange={(v) => onChange(v === " " ? "" : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y.id} value={y.name}>
              {y.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
