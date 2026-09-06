import * as React from "react";
import { cn } from "@/lib/utils";

// Stand-in for shadcn `badge` — see button.tsx for the note on swapping in the real CLI output.
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}
