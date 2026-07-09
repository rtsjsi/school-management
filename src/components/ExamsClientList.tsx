"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import ExamEntryDialog from "@/components/ExamEntryDialog";
import { ExamEditDialog } from "@/components/ExamEditDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { fetchStandards } from "@/lib/lov";
import type { StandardOption } from "@/lib/lov";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExamRow = { id: string; name: string; standard: string | null; term: string | null };

export function ExamsClientList({ exams, canEdit }: { exams: ExamRow[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [standardFilter, setStandardFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [standardsList, setStandardsList] = useState<StandardOption[]>([]);

  useEffect(() => {
    fetchStandards().then(setStandardsList);
  }, []);

  const isDefaultState = standardFilter === "all" && termFilter === "all" && !search.trim();

  const filteredExams = isDefaultState ? [] : exams.filter((exam) => {
    const sTerm = search.toLowerCase();
    const matchName = exam.name.toLowerCase().includes(sTerm);
    const matchStd = standardFilter === "all" || exam.standard === standardFilter;
    const matchTerm = termFilter === "all" || exam.term === termFilter;
    return matchName && matchStd && matchTerm;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">
          <Select value={standardFilter} onValueChange={setStandardFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Standards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              {standardsList.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="Term-1">Term-1</SelectItem>
              <SelectItem value="Term-2">Term-2</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Exam Name..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {canEdit && <ExamEntryDialog />}
      </div>
      
      {filteredExams.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam name</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Term</TableHead>
                {canEdit && <TableHead className="w-24">Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{exam.standard ?? "—"}</TableCell>
                  <TableCell>{exam.term ?? "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <ExamEditDialog exam={exam} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-4">Current academic year exams</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center bg-muted/20 border border-dashed rounded-lg">
          {isDefaultState 
            ? "Please select a Standard, Term, or search for an Exam Name to view exams." 
            : "No exams match your selected filters."}
        </p>
      )}
    </div>
  );
}
