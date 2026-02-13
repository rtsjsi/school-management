"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
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
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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
    setGrade("");
    setSection("");
    setStatus("");
    onSearch({
      searchTerm: "",
      grade: "",
      section: "",
      status: "",
    });
  };

  const hasActiveFilters = searchTerm || grade || section || status;

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
                  <SelectItem value="">All grades</SelectItem>
                  <SelectItem value="1">Grade 1</SelectItem>
                  <SelectItem value="2">Grade 2</SelectItem>
                  <SelectItem value="3">Grade 3</SelectItem>
                  <SelectItem value="4">Grade 4</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                  <SelectItem value="7">Grade 7</SelectItem>
                  <SelectItem value="8">Grade 8</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                  <SelectItem value="11">Grade 11</SelectItem>
                  <SelectItem value="12">Grade 12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section Filter */}
            <div className="space-y-2">
              <Label htmlFor="section-filter">Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger id="section-filter">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                  <SelectItem value="D">Section D</SelectItem>
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
                  <SelectItem value="">All statuses</SelectItem>
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
