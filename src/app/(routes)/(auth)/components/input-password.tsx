"use client";

import { Eye, EyeOff } from "lucide-react";
import { cloneElement, useState, ReactElement, isValidElement } from "react";

type InputPasswordContainerProps = React.ComponentPropsWithoutRef<"input"> & {
  children: ReactElement<React.ComponentPropsWithoutRef<"input">>;
};

export default function InputPasswordContainer({
  children,
  ...inputProps
}: InputPasswordContainerProps) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  return (
    <div className="space-y-2">
      <div className="relative">
        {isValidElement(children) &&
          cloneElement(children, {
            ...inputProps,
            type: isVisible ? "text" : "password",
          })}
        <button
          className="absolute inset-y-0 end-0 flex h-full w-14 items-center justify-center rounded-e-full text-[#cdd5e0] outline-offset-2 transition-colors hover:text-white focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={toggleVisibility}
          aria-label={isVisible ? "隐藏密码" : "显示密码"}
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
