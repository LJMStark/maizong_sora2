"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFloatingInputProps = React.ComponentProps<"input"> & {
  label: string;
  labelEnd?: "default" | "action";
};

export function AuthFloatingInput({
  className,
  id,
  label,
  labelEnd = "default",
  "aria-invalid": ariaInvalid,
  ...props
}: AuthFloatingInputProps) {
  const isInvalid = ariaInvalid === true || ariaInvalid === "true";
  const hasValue =
    typeof props.value === "string"
      ? props.value.length > 0
      : props.value != null ||
        (typeof props.defaultValue === "string" &&
          props.defaultValue.length > 0);

  return (
    <div
      className="group relative w-full"
      data-has-value={hasValue ? "true" : "false"}
      data-invalid={isInvalid ? "true" : "false"}
    >
      <Input
        {...props}
        id={id}
        aria-invalid={ariaInvalid}
        placeholder=" "
        className={cn(
          "peer h-[52px] rounded-full border-white/15 bg-transparent px-5 pb-1 pt-[18px] text-[16px] text-white shadow-none placeholder:text-transparent focus-visible:border-[#9b99ff] focus-visible:ring-[#9b99ff]/25 md:text-[16px]",
          "aria-invalid:border-red-300/80 aria-invalid:text-red-100 aria-invalid:focus-visible:border-red-300/80 aria-invalid:focus-visible:ring-red-300/20",
          className
        )}
      />
      <label
        htmlFor={typeof id === "string" ? id : undefined}
        className={cn(
          "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 truncate text-[16px] leading-none text-[#cdd5e0] transition-all duration-150",
          "group-focus-within:top-[9px] group-focus-within:translate-y-0 group-focus-within:text-[12px] group-focus-within:text-[#a6baff]",
          "group-data-[has-value=true]:top-[9px] group-data-[has-value=true]:translate-y-0 group-data-[has-value=true]:text-[12px] group-data-[has-value=true]:text-[#a6baff]",
          labelEnd === "action" ? "right-14" : "right-5",
          "group-data-[invalid=true]:text-red-100/80 group-data-[invalid=true]:group-focus-within:text-red-100"
        )}
      >
        {label}
      </label>
    </div>
  );
}
