"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  className = "w-64",
}) => {
  const t = useTranslations("studio");

  return (
    <div className={className}>
      <div className="mb-2 flex justify-between text-xs text-[#777]">
        <span>{label || t("image.canvas.progress")}</span>
        {showPercentage && <span>{progress}%</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ececec]">
        <div
          className="h-full bg-[#0d0d0d] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
