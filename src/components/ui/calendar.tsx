"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex justify-center items-center relative h-8",
        caption_label: "text-sm font-semibold",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        nav_button: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100"
        ),
        button_previous: "h-7 w-7",
        button_next: "h-7 w-7",
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday:
          "w-9 h-8 flex items-center justify-center text-muted-foreground font-medium text-xs",
        week: "flex w-full mt-1",
        day: "w-9 h-9 p-0 text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "w-9 h-9 p-0 font-normal"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

