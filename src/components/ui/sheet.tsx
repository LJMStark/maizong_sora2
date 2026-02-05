"use client"

import * as React from "react"
import {
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogBackdrop,
  DialogTitle as HeadlessDialogTitle,
  Description,
  CloseButton,
} from "@headlessui/react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <HeadlessDialog
      open={open}
      onClose={() => onOpenChange?.(false)}
      className="relative z-50"
    >
      {children}
    </HeadlessDialog>
  )
}

function SheetTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (asChild && React.isValidElement(children)) {
    return children
  }
  return <button {...props}>{children}</button>
}

function SheetClose({
  children,
  className,
  asChild,
  ...props
}: {
  children?: React.ReactNode
  className?: string
  asChild?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <CloseButton
      className={className}
      {...props}
    >
      {children}
    </CloseButton>
  )
}

function SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <DialogBackdrop
    ref={ref}
    transition
    className={cn(
      "fixed inset-0 z-50 bg-black/80 transition-opacity duration-300 ease-out data-[closed]:opacity-0",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition duration-300 ease-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[closed]:-translate-y-full",
        bottom: "inset-x-0 bottom-0 border-t data-[closed]:translate-y-full",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[closed]:-translate-x-full sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[closed]:translate-x-full sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => (
    <>
      <SheetOverlay />
      <DialogPanel
        ref={ref}
        transition
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        <CloseButton className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </CloseButton>
        {children}
      </DialogPanel>
    </>
  )
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <HeadlessDialogTitle
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
