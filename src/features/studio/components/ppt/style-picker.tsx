"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PPT_SKILLS } from "@/features/studio/data/ppt-skills";
import type { PptStyle } from "@/features/studio/data/ppt-skills/types";

interface StylePickerProps {
  skillKey: string;
  styleKey: string;
  anchorColor: string | null;
  onSelect: (skillKey: string, styleKey: string) => void;
  onAnchorColorChange: (hex: string | null) => void;
}

/** 无预览图时以风格色板渲染卡片头图 */
function StyleSwatch({ style }: { style: PptStyle }) {
  const colors =
    style.anchorColors?.map((c) => c.hex) ??
    (style.colorRule.match(/#[0-9A-Fa-f]{6}/g) || []).slice(0, 4);
  const fallback = ["#1a1a18", "#fafaf7"];
  const palette = colors.length > 0 ? colors : fallback;

  return (
    <span className="relative flex aspect-video w-full overflow-hidden rounded-xl">
      {palette.map((hex) => (
        <span key={hex} className="h-full flex-1" style={{ backgroundColor: hex }} />
      ))}
      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/[0.08]" />
      <span className="absolute bottom-1.5 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-[#333]">
        16:9
      </span>
    </span>
  );
}

export function StylePicker({
  skillKey,
  styleKey,
  anchorColor,
  onSelect,
  onAnchorColorChange,
}: StylePickerProps) {
  const [activeSkillKey, setActiveSkillKey] = useState(
    skillKey || PPT_SKILLS[0]?.key || ""
  );

  const activeSkill =
    PPT_SKILLS.find((s) => s.key === activeSkillKey) ?? PPT_SKILLS[0];
  const selectedStyle =
    activeSkill?.key === skillKey
      ? activeSkill.styles.find((s) => s.key === styleKey)
      : undefined;

  return (
    <div>
      <div
        aria-label="PPT 技能引擎"
        className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {PPT_SKILLS.map((skill) => {
          const active = skill.key === activeSkillKey;
          return (
            <button
              key={skill.key}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveSkillKey(skill.key)}
              className={cn(
                "h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm transition",
                active
                  ? "bg-[#0d0d0d] font-medium text-white"
                  : "border border-black/10 bg-white text-[#555] hover:bg-black/[0.04]"
              )}
            >
              {skill.name}
            </button>
          );
        })}
      </div>

      {activeSkill && (
        <p className="mt-2 text-[13px] leading-5 text-[#999]">
          {activeSkill.description}
          <a
            href={activeSkill.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1.5 text-[#777] underline decoration-black/20 underline-offset-2 hover:text-[#0d0d0d]"
          >
            GitHub
          </a>
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {activeSkill?.styles.map((style) => {
          const selected =
            activeSkill.key === skillKey && style.key === styleKey;
          return (
            <button
              key={style.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(activeSkill.key, style.key)}
              className={cn(
                "group rounded-2xl border p-2.5 text-left transition",
                selected
                  ? "border-[#0d0d0d] bg-black/[0.03]"
                  : "border-black/10 bg-white hover:border-black/25"
              )}
            >
              <StyleSwatch style={style} />
              <span className="mt-2 flex items-center justify-between gap-1">
                <span className="truncate text-[14px] font-medium text-[#0d0d0d]">
                  {style.name}
                </span>
                {selected && <Check className="size-4 shrink-0 text-[#0d0d0d]" />}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-[#999]">
                {style.description}
              </span>
            </button>
          );
        })}
      </div>

      {selectedStyle?.anchorColors && selectedStyle.anchorColors.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[#777]">锚点色</span>
          {selectedStyle.anchorColors.map((color) => {
            const active = anchorColor === color.hex;
            return (
              <button
                key={color.hex}
                type="button"
                aria-pressed={active}
                title={color.name}
                onClick={() => onAnchorColorChange(active ? null : color.hex)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition",
                  active
                    ? "border-[#0d0d0d] bg-black/[0.04] text-[#0d0d0d]"
                    : "border-black/10 bg-white text-[#666] hover:border-black/25"
                )}
              >
                <span
                  className="size-4 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
