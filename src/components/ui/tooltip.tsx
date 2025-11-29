"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip@1.1.8";

import { cn } from "./utils";

/**
 * TooltipProvider with accessibility-focused default settings
 * - Slightly longer delay for better keyboard/screen reader experience
 * - Skip delay for faster interaction on sequential tooltips
 */
function TooltipProvider({
  delayDuration = 300,
  skipDelayDuration = 100,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Content> {
  showArrow?: boolean;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  showArrow = true,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        role="tooltip"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground border border-border shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-lg px-3 py-2 text-sm",
          className,
        )}
        {...props}
      >
        {children}
        {showArrow && (
          <TooltipPrimitive.Arrow
            className="fill-popover drop-shadow-sm"
            width={10}
            height={5}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/**
 * Accessible tooltip wrapper that adds proper ARIA attributes
 * Use this for elements that have a tooltip describing them
 */
function AccessibleTooltip({
  children,
  content,
  side = 'top',
  ...props
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
} & Omit<React.ComponentProps<typeof Tooltip>, 'children'>) {
  const id = React.useId();

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild aria-describedby={id}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} id={id}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, AccessibleTooltip };
