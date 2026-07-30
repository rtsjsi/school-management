"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type StudentSearchOption = {
  id: string;
  full_name: string;
  standard?: string | null;
  division?: string | null;
  gr_number?: string | null;
  is_rte_quota?: boolean | null;
};

export function formatStudentSearchLabel(s: StudentSearchOption): string {
  const cls = s.standard
    ? ` (${s.standard}${s.division ? "-" + s.division : ""})`
    : "";
  const gr = s.gr_number ? ` · ${s.gr_number}` : "";
  const rte = s.is_rte_quota ? " · RTE" : "";
  return `${s.full_name}${cls}${gr}${rte}`;
}

type StudentSearchSelectProps = {
  students: StudentSearchOption[];
  value: string;
  onChange: (studentId: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Show an empty option that clears the selection (e.g. All Students). */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /**
   * Called before applying a student selection.
   * Return `false` to cancel (e.g. block RTE students).
   */
  onBeforeSelect?: (student: StudentSearchOption) => boolean | void;
};

export function StudentSearchSelect({
  students,
  value,
  onChange,
  id = "student_search",
  label = "Student",
  required = false,
  placeholder = "Type name, GR no., class…",
  className,
  disabled = false,
  allowEmpty = false,
  emptyLabel = "All Students",
  onBeforeSelect,
}: StudentSearchSelectProps) {
  const selected = useMemo(
    () => students.find((s) => s.id === value) ?? null,
    [students, value]
  );
  const [input, setInput] = useState(() =>
    selected ? formatStudentSearchLabel(selected) : allowEmpty && !value ? emptyLabel : ""
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-suggestions-list`;

  useEffect(() => {
    if (selected) {
      setInput(formatStudentSearchLabel(selected));
    } else if (allowEmpty && !value) {
      setInput((prev) => (open ? prev : emptyLabel));
    } else if (!value) {
      setInput("");
    }
  }, [selected, value, allowEmpty, emptyLabel, open]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      if (selected) {
        setInput(formatStudentSearchLabel(selected));
      } else if (allowEmpty && !value) {
        setInput(emptyLabel);
      } else if (!value) {
        setInput("");
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [selected, allowEmpty, emptyLabel, value]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    const searchingEmptyLabel =
      allowEmpty && (q === "" || emptyLabel.toLowerCase().includes(q));

    const matched = (!q
      ? students.slice(0, 100)
      : students
          .filter((s) => {
            const blob = [s.full_name, s.gr_number, s.standard, s.division]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return blob.includes(q);
          })
          .slice(0, 100)
    );

    return { searchingEmptyLabel, matched };
  }, [students, input, allowEmpty, emptyLabel]);

  const selectStudent = (s: StudentSearchOption) => {
    if (onBeforeSelect?.(s) === false) {
      setOpen(false);
      return;
    }
    onChange(s.id);
    setInput(formatStudentSearchLabel(s));
    setOpen(false);
  };

  const selectEmpty = () => {
    onChange("");
    setInput(emptyLabel);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-1.5 relative", className)} ref={rootRef}>
      {label && (
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={input}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          setInput(v);
          setOpen(true);
          if (value) {
            const cur = students.find((x) => x.id === value);
            if (cur && formatStudentSearchLabel(cur) !== v) {
              onChange("");
            }
          }
        }}
        onFocus={() => {
          setOpen(true);
          if (allowEmpty && !value && input === emptyLabel) {
            setInput("");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="h-9 text-sm"
      />
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-52 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
        >
          {allowEmpty && suggestions.searchingEmptyLabel && (
            <li role="option" aria-selected={!value}>
              <button
                type="button"
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                  !value && "bg-accent/60"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={selectEmpty}
              >
                <span className="block truncate">{emptyLabel}</span>
              </button>
            </li>
          )}
          {suggestions.matched.length === 0 &&
          !(allowEmpty && suggestions.searchingEmptyLabel) ? (
            <li className="px-2 py-2 text-xs text-muted-foreground text-center">No match.</li>
          ) : (
            suggestions.matched.map((s) => (
              <li key={s.id} role="option" aria-selected={value === s.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    value === s.id && "bg-accent/60"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectStudent(s)}
                >
                  <span className="block truncate">{formatStudentSearchLabel(s)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
