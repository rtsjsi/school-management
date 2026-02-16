"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a table so both horizontal and vertical scrollbars are always visible
 * at the viewport edges (fixes horizontal scrollbar only visible when scrolled to bottom).
 */
const TableScrollWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { maxHeight?: string | number }
>(({ className, maxHeight = 400, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col min-w-0", className)}
    style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
    {...props}
  >
    <div className="flex-1 min-h-0 overflow-auto">{children}</div>
  </div>
));
TableScrollWrapper.displayName = "TableScrollWrapper";

export { TableScrollWrapper };
