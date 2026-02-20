import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background";

const primaryClasses =
  "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm";
const secondaryClasses =
  "bg-secondary text-secondary-foreground hover:bg-secondary/80";
const outlineClasses =
  "border border-input bg-background hover:bg-accent hover:text-accent-foreground";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const variantClasses =
      variant === "secondary"
        ? secondaryClasses
        : variant === "outline"
        ? outlineClasses
        : primaryClasses;

    return (
      <button
        className={cn(buttonVariants, variantClasses, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
