"use client";

import { useState } from "react";
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

type ExamRow = { id: string; name: string; standard: string | null; term: string | null };

export function ExamsClientList({ exams, canEdit }: { exams: ExamRow[]; canEdit: boolean }) {
  const [search, setSearch] = useState("");

  const filteredExams = exams.filter((exam) => {
    const term = search.toLowerCase();
    return (
      exam.name.toLowerCase().includes(term) ||
      (exam.standard && exam.standard.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exams..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
        <p className="text-sm text-muted-foreground py-8 text-center">
          {search ? "No exams match your search." : "No exams in the current academic year."}
        </p>
      )}
    </div>
  );
}
