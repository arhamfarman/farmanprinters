import * as React from "react";
import { cn } from "@/lib/utils";

// Stand-in for shadcn `input` — see button.tsx for the note on swapping in the real CLI output.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
