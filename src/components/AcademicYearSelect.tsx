"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAcademicYears } from "@/lib/lov";
import type { AcademicYearOption } from "@/lib/lov";

interface AcademicYearSelectProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  label?: string;
}

export function AcademicYearSelect({ value, onChange, id = "academic_year", label = "Academic year" }: AcademicYearSelectProps) {
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const hasDefaulted = useRef(false);

  useEffect(() => {
    fetchAcademicYears().then(setYears);
  }, []);

  // Default to current (active) academic year when value is empty
  useEffect(() => {
    if (hasDefaulted.current || value !== "" || years.length === 0) return;
    const active = years.find((y) => y.is_active) ?? years[0];
    if (active?.name) {
      hasDefaulted.current = true;
      onChange(active.name);
    }
  }, [years, value, onChange]);

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
