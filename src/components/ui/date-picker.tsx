"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  startMonth?: Date;
  endMonth?: Date;
};

function formatIsoToDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${day}-${month}-${year}`;
}

function isoToLocalDate(iso: string): Date | undefined {
  const [year, month, day] = iso.split("-").map((n) => Number(n));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  className,
  startMonth = new Date(1950, 0),
  endMonth = new Date(2100, 11),
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-9 w-full justify-start font-normal", className)}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          {value ? formatIsoToDisplayDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={isoToLocalDate(value)}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          onSelect={(date) => {
            if (!date) return;
            onChange(localDateToIso(date));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

