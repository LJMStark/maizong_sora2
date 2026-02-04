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
      <div className="flex justify-between text-xs text-[#4b5563] mb-2">
        <span>{label || t("image.canvas.progress")}</span>
        {showPercentage && <span>{progress}%</span>}
      </div>
      <div className="h-2 bg-[#e5e5e1] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1a1a1a] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
