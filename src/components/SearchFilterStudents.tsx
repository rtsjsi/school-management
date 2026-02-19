"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { fetchClasses, fetchAllDivisions } from "@/lib/lov";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SearchFilterStudentsProps {
  onSearch: (filters: {
    searchTerm: string;
    grade: string;
    section: string;
    status: string;
  }) => void;
}

export function SearchFilterStudents({ onSearch }: SearchFilterStudentsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [grade, setGrade] = useState("all");
  const [section, setSection] = useState("all");
  const [status, setStatus] = useState("all");
  const [isOpen, setIsOpen] = useState(false);
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchClasses().then(setGrades);
    fetchAllDivisions().then(setDivisions);
  }, []);

  const handleSearch = useCallback(() => {
    onSearch({
      searchTerm,
      grade,
      section,
      status,
    });
  }, [searchTerm, grade, section, status, onSearch]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setGrade("all");
    setSection("all");
    setStatus("all");
    onSearch({
      searchTerm: "",
      grade: "all",
      section: "all",
      status: "all",
    });
  };

  const hasActiveFilters = searchTerm || (grade && grade !== "all") || (section && section !== "all") || (status && status !== "all");

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-primary hover:text-primary/90 font-medium inline-flex items-center gap-1"
      >
        {isOpen ? "Hide" : "Show"} Search & Filter
      </button>

      {isOpen && (
        <div className="p-4 border border-border/50 rounded-lg bg-muted/30 space-y-4">
          {/* Search Box */}
          <div className="space-y-2">
            <Label htmlFor="search">Search by Name or Student ID</Label>
            <Input
              id="search"
              type="text"
              placeholder="John Doe, STU-2025-..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Grade Filter */}
            <div className="space-y-2">
              <Label htmlFor="grade-filter">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger id="grade-filter">
                  <SelectValue placeholder="All grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Filter */}
            <div className="space-y-2">
              <Label htmlFor="section-filter">Division</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger id="section-filter">
                  <SelectValue placeholder="All divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All divisions</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSearch}
              className="bg-primary hover:bg-primary/90"
            >
              Search
            </Button>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFilters}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
