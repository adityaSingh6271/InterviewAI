import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#0C356A] text-[#FFFFFF] hover:bg-[#092B57] active:bg-[#061D3A]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500/20 dark:bg-red-600 dark:hover:bg-red-700",
        outline:
          "border border-[#B8C7DA] bg-[#FFFFFF] text-[#0C356A] hover:bg-[#F1F6FD] hover:text-[#0C356A] active:bg-[#DFECFD] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-[#0C356A]/5 text-[#0C356A]/90 border border-[#0C356A]/5 hover:bg-[#0C356A]/10 active:bg-[#0C356A]/20 dark:bg-[#0C356A]/30 dark:border-[#0C356A]/40 dark:text-blue-200 dark:hover:bg-[#0C356A]/40",
        ghost:
          "text-[#0C356A] hover:border-[#B8C7DA] hover:bg-[#F1F6FD] hover:text-[#0C356A] active:bg-[#DFECFD] dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline active:underline",
        destructive_outline:
          "border border-red-200 text-red-500 hover:bg-red-50 active:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:text-destructive",
        secondary_outline:
          "border border-[#0C356A]/10 bg-[#E8F1FD] text-[#0C356A] hover:bg-[#D7E7FA] active:bg-[#C8DEF7] dark:bg-[#0C356A]/20 dark:border-[#0C356A] dark:text-blue-300 dark:hover:bg-[#0C356A]/30",
        date_outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-[6px] px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
