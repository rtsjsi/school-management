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
import { fetchStandards, fetchDivisionsByStandard, fetchAcademicYears } from "@/lib/lov";

interface StandardDivisionYearSelectsProps {
  standard: string;
  division: string;
  academicYear?: string;
  onStandardChange: (v: string) => void;
  onDivisionChange: (v: string) => void;
  onAcademicYearChange?: (v: string) => void;
  standardRequired?: boolean;
  divisionRequired?: boolean;
  showAcademicYear?: boolean;
  academicYearRequired?: boolean;
}

export function StandardDivisionYearSelects({
  standard,
  division,
  academicYear,
  onStandardChange,
  onDivisionChange,
  onAcademicYearChange,
  standardRequired,
  divisionRequired,
  showAcademicYear = true,
  academicYearRequired,
}: StandardDivisionYearSelectsProps) {
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string; status?: string | null }[]>([]);

  useEffect(() => {
    fetchStandards().then(setStandards);
  }, []);

  useEffect(() => {
    fetchAcademicYears().then(setYears);
  }, []);

  useEffect(() => {
    if (!onAcademicYearChange || academicYear || years.length === 0) return;
    const active = years.find((x) => x.status === "active") ?? years[0];
    if (active?.name) onAcademicYearChange(active.name);
  }, [years, academicYear, onAcademicYearChange]);

  useEffect(() => {
    if (standard) {
      fetchDivisionsByStandard(standard).then((data) => {
        const list = [...data];
        if (division && !list.some((d) => d.name === division)) {
          list.push({ id: `existing-${division}`, name: division });
        }
        setDivisions(list);
      });
    } else {
      setDivisions([]);
    }
  }, [standard, division]);

  return (
    <>
      <div className="space-y-2">
        <Label>Standard *</Label>
        <Select value={standard || " "} onValueChange={(v) => onStandardChange(v === " " ? "" : v)} required={standardRequired}>
          <SelectTrigger>
            <SelectValue placeholder="Select standard" />
          </SelectTrigger>
          <SelectContent>
            {standards.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Division *</Label>
        <Select
          value={division || " "}
          onValueChange={(v) => onDivisionChange(v === " " ? "" : v)}
          required={divisionRequired}
          disabled={!standard}
        >
          <SelectTrigger>
            <SelectValue placeholder={standard ? "Select division" : "Select standard first"} />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showAcademicYear && (
        <div className="space-y-2">
          <Label>Academic year{academicYearRequired ? " *" : ""}</Label>
          <Select
            value={academicYear || " "}
            onValueChange={(v) => onAcademicYearChange?.(v === " " ? "" : v)}
            required={academicYearRequired}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years
                .filter(
                  (y) =>
                    y.status !== "closed" ||
                    (academicYear && y.name === academicYear)
                )
                .map((y) => (
                  <SelectItem key={y.id} value={y.name}>
                    {y.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
