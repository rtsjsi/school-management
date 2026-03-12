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
import { fetchStandards, fetchDivisionsByGrade, fetchAcademicYears } from "@/lib/lov";

interface GradeDivisionYearSelectsProps {
  grade: string;
  division: string;
  academicYear?: string;
  onGradeChange: (v: string) => void;
  onDivisionChange: (v: string) => void;
  onAcademicYearChange?: (v: string) => void;
  gradeRequired?: boolean;
  divisionRequired?: boolean;
  showAcademicYear?: boolean;
  academicYearRequired?: boolean;
}

export function GradeDivisionYearSelects({
  grade,
  division,
  academicYear,
  onGradeChange,
  onDivisionChange,
  onAcademicYearChange,
  gradeRequired,
  divisionRequired,
  showAcademicYear = true,
  academicYearRequired,
}: GradeDivisionYearSelectsProps) {
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string; status?: string | null }[]>([]);

  useEffect(() => {
    fetchStandards().then(setStandards);
    fetchAcademicYears().then((y) => {
      setYears(y);
      if (onAcademicYearChange && !academicYear && y.length > 0) {
        const active = y.find((x) => x.status === "active") ?? y[0];
        if (active?.name) onAcademicYearChange(active.name);
      }
    });
  }, []);

  useEffect(() => {
    if (grade) {
      fetchDivisionsByGrade(grade).then((data) => {
        const list = [...data];
        if (division && !list.some((d) => d.name === division)) {
          list.push({ id: `existing-${division}`, name: division });
        }
        setDivisions(list);
      });
    } else {
      setDivisions([]);
    }
  }, [grade, division]);

  return (
    <>
      <div className="space-y-2">
        <Label>Standard *</Label>
        <Select value={grade || " "} onValueChange={(v) => onGradeChange(v === " " ? "" : v)} required={gradeRequired}>
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
          disabled={!grade}
        >
          <SelectTrigger>
            <SelectValue placeholder={grade ? "Select division" : "Select standard first"} />
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
              {years.map((y) => (
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
