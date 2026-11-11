"use client";

import * as React from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  Add01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Cancel01Icon,
  Tick01Icon,
  Download02Icon,
  FilterIcon,
  Search01Icon,
  EyeIcon,
  ArrowLeft02Icon,
  Printer,
  CheckmarkCircle01Icon,
  MoreVerticalIcon,
  Share08Icon,
  Close,
  PlayIcon,
  FileTextIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JiggleCSS } from "@/lib/customStyles";

// ─── Action Types ─────────────────────────────────────────────────────────────

export type ButtonActionType =
  | "add"
  | "create"
  | "delete"
  | "remove"
  | "update"
  | "edit"
  | "cancel"
  | "close"
  | "save"
  | "submit"
  | "download"
  | "export"
  | "filter"
  | "search"
  | "view"
  | "back"
  | "print"
  | "approve"
  | "reject";

// ─── Action Config Map ────────────────────────────────────────────────────────

type ButtonVariantType =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "destructive_outline"
  | "secondary_outline";

const ACTION_CONFIGS: Record<
  ButtonActionType,
  {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    icon: any;
    label: string;
    variant: ButtonVariantType;
  }
> = {
  add: { icon: Add01Icon, label: "Add", variant: "default" },
  create: { icon: Add01Icon, label: "Create", variant: "default" },
  delete: { icon: Delete02Icon, label: "Delete", variant: "destructive" },
  remove: { icon: Delete02Icon, label: "Remove", variant: "destructive" },
  update: { icon: PencilEdit02Icon, label: "Update", variant: "default" },
  edit: { icon: PencilEdit02Icon, label: "Edit", variant: "default" },
  cancel: { icon: Cancel01Icon, label: "Cancel", variant: "destructive_outline" },
  close: { icon: Cancel01Icon, label: "Close", variant: "destructive_outline" },
  save: { icon: Tick01Icon, label: "Save", variant: "default" },
  submit: { icon: Tick01Icon, label: "Submit", variant: "default" },
  download: { icon: Download02Icon, label: "Download", variant: "outline" },
  export: { icon: Download02Icon, label: "Export", variant: "outline" },
  filter: { icon: FilterIcon, label: "Filter", variant: "outline" },
  search: { icon: Search01Icon, label: "Search", variant: "outline" },
  view: { icon: EyeIcon, label: "View", variant: "ghost" },
  back: { icon: ArrowLeft02Icon, label: "Back", variant: "outline" },
  print: { icon: Printer, label: "Print", variant: "outline" },
  approve: { icon: CheckmarkCircle01Icon, label: "Approve", variant: "default" },
  reject: { icon: Cancel01Icon, label: "Reject", variant: "destructive" },
};

// ─── Re-export commonly used HugeIcons for convenience ───────────────────────
export {
  Add01Icon,
  Delete02Icon,
  PencilEdit02Icon,
  Cancel01Icon,
  Tick01Icon,
  Download02Icon,
  FilterIcon,
  Search01Icon,
  EyeIcon,
  ArrowLeft02Icon,
  Printer as PrinterIcon,
  CheckmarkCircle01Icon,
  MoreVerticalIcon,
  Share08Icon,
  Close as CloseIcon,
  PlayIcon,
  FileTextIcon,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface IconButtonProps
  extends React.ComponentProps<typeof Button> {
  /**
   * Predefined action (add, delete, edit, cancel, save, etc.).
   * Automatically sets icon, default label, and button variant.
   */
  action?: ButtonActionType;

  /**
   * The icon to display. Can be a HugeIcon definition, Lucide icon component,
   * or any React element. Overrides the `action` icon if provided.
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  icon?: LucideIcon | HugeiconsIconProps["icon"] | unknown | any;

  /** Position of the icon relative to the label. @default "left" */
  iconPosition?: "left" | "right";

  /** Additional CSS classes for the icon element. */
  iconClassName?: string;

  /** Stroke width for the icon. @default 2 */
  strokeWidth?: number;

  /**
   * Text label. Overrides default action label.
   * Pass `null` or `""` or `showLabel={false}` to show icon only.
   */
  label?: React.ReactNode;

  /** Set to false to hide the text label (icon-only mode). @default true */
  showLabel?: boolean;

  /** Show a loading spinner and disable button. @default false */
  isLoading?: boolean;

  /** Text displayed while `isLoading` is true. */
  loadingText?: React.ReactNode;

  /** Custom spinner while loading. Defaults to Lucide Loader2. */
  loadingSpinner?: React.ReactNode;

  /** Optional tooltip text shown on hover. */
  tooltip?: React.ReactNode;

  /** Side the tooltip appears on. @default "top" */
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * IconButton — a versatile button with HugeIcons, predefined actions,
 * loading states, JiggleCSS hover animations, and optional tooltips.
 *
 * Mirrors the ERP Academic project's IconButton API for consistency.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      action,
      icon,
      iconPosition = "left",
      iconClassName,
      strokeWidth = 2,
      label,
      showLabel = true,
      children,
      isLoading = false,
      loadingText,
      loadingSpinner,
      tooltip,
      tooltipSide = "top",
      disabled,
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const actionConfig = action ? ACTION_CONFIGS[action] : undefined;

    const targetIcon = icon ?? actionConfig?.icon;
    const targetVariant = variant ?? actionConfig?.variant;
    const resolvedLabel = label !== undefined ? label : actionConfig?.label;
    const content =
      showLabel === false
        ? null
        : children !== undefined
        ? children
        : resolvedLabel;
    const displayContent = isLoading && loadingText ? loadingText : content;

    const renderIcon = () => {
      if (isLoading) {
        return (
          loadingSpinner || (
            <Loader2
              className={cn("size-4 animate-spin shrink-0", iconClassName)}
            />
          )
        );
      }

      if (!targetIcon) return null;

      // 1. Already a rendered React element
      if (React.isValidElement(targetIcon)) {
        return React.cloneElement(
          targetIcon as React.ReactElement<{
            className?: string;
            strokeWidth?: number;
          }>,
          {
            className: cn(
              "size-4 shrink-0",
              (targetIcon.props as { className?: string }).className,
              JiggleCSS,
              iconClassName
            ),
            strokeWidth:
              (targetIcon.props as { strokeWidth?: number }).strokeWidth ??
              strokeWidth,
          }
        );
      }

      // 2. Lucide-style component reference (function or forwardRef object)
      if (
        typeof targetIcon === "function" ||
        (typeof targetIcon === "object" &&
          targetIcon !== null &&
          ("$$typeof" in targetIcon || "render" in targetIcon))
      ) {
        const IconComponent = targetIcon as React.ComponentType<{
          className?: string;
          strokeWidth?: number;
        }>;
        return (
          <IconComponent
            className={cn("size-4 shrink-0", JiggleCSS, iconClassName)}
            strokeWidth={strokeWidth}
          />
        );
      }

      // 3. HugeIcons icon object/array definition
      if (Array.isArray(targetIcon) || (typeof targetIcon === "object" && targetIcon !== null)) {
        return (
          <HugeiconsIcon
            icon={targetIcon as React.ComponentProps<typeof HugeiconsIcon>["icon"]}
            className={cn("size-4 shrink-0", JiggleCSS, iconClassName)}
            strokeWidth={strokeWidth}
          />
        );
      }

      return (
        <span className={cn("shrink-0", JiggleCSS, iconClassName)}>
          {targetIcon as React.ReactNode}
        </span>
      );
    };

    const buttonNode = (
      <Button
        ref={ref}
        variant={targetVariant as React.ComponentProps<typeof Button>["variant"]}
        size={size}
        disabled={disabled || isLoading}
        asChild={asChild}
        className={cn("group", className)}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {iconPosition === "left" && renderIcon()}
            {displayContent && (
              <span className={cn(isLoading && !loadingText ? "opacity-90" : "")}>
                {displayContent}
              </span>
            )}
            {iconPosition === "right" && renderIcon()}
          </>
        )}
      </Button>
    );

    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonNode}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return buttonNode;
  }
);

IconButton.displayName = "IconButton";

export const ButtonWithIcon = IconButton;
export default IconButton;
