"use client";

import React from "react";
import { ArrowLeft, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { PptLayoutRole } from "@/features/studio/data/ppt-skills/types";
import { PPT_LAYOUT_ROLE_LABELS, PptOutlineSlideDraft } from "./types";

const MIN_PAGES = 3;
const MAX_PAGES = 20;
const LAYOUT_ROLES = Object.keys(PPT_LAYOUT_ROLE_LABELS) as PptLayoutRole[];

interface StepOutlineProps {
  deckTitle: string;
  onDeckTitleChange: (title: string) => void;
  slides: PptOutlineSlideDraft[];
  onSlidesChange: (slides: PptOutlineSlideDraft[]) => void;
  creditCostPerPage: number;
  isRegenerating: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onRegenerate: () => void;
  onSubmit: () => void;
}

function reindex(slides: PptOutlineSlideDraft[]): PptOutlineSlideDraft[] {
  return slides.map((slide, i) => ({ ...slide, index: i + 1 }));
}

export function StepOutline({
  deckTitle,
  onDeckTitleChange,
  slides,
  onSlidesChange,
  creditCostPerPage,
  isRegenerating,
  isSubmitting,
  onBack,
  onRegenerate,
  onSubmit,
}: StepOutlineProps) {
  const updateSlide = (index: number, patch: Partial<PptOutlineSlideDraft>) => {
    onSlidesChange(
      slides.map((slide) =>
        slide.index === index ? { ...slide, ...patch } : slide
      )
    );
  };

  const removeSlide = (index: number) => {
    if (slides.length <= MIN_PAGES) return;
    onSlidesChange(reindex(slides.filter((slide) => slide.index !== index)));
  };

  const addSlide = (afterIndex: number) => {
    if (slides.length >= MAX_PAGES) return;
    const next = [...slides];
    next.splice(afterIndex, 0, {
      index: 0,
      title: "新页面",
      bullets: [],
      layoutRole: "content",
    });
    onSlidesChange(reindex(next));
  };

  const estimatedCost = slides.length * creditCostPerPage;
  const canSubmit =
    slides.length >= MIN_PAGES &&
    slides.every((s) => s.title.trim().length > 0) &&
    Boolean(deckTitle.trim()) &&
    !isSubmitting &&
    !isRegenerating;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[14px] text-[#777] transition hover:text-[#0d0d0d]"
        >
          <ArrowLeft className="size-4" />
          返回配置
        </button>
        <button
          type="button"
          disabled={isRegenerating || isSubmitting}
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[13px] text-[#555] transition hover:bg-black/[0.04] disabled:opacity-50"
        >
          {isRegenerating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          重新生成大纲
        </button>
      </div>

      <div>
        <label className="text-[13px] text-[#777]" htmlFor="ppt-deck-title">
          PPT 标题
        </label>
        <input
          id="ppt-deck-title"
          value={deckTitle}
          maxLength={100}
          onChange={(e) => onDeckTitleChange(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[16px] font-medium text-[#0d0d0d] outline-none transition focus:border-black/30"
        />
      </div>

      <ol className="space-y-3">
        {slides.map((slide) => (
          <li
            key={slide.index}
            className="rounded-2xl border border-black/10 bg-white p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-[12px] font-semibold text-white">
                {slide.index}
              </span>
              <input
                value={slide.title}
                maxLength={60}
                placeholder="页面标题"
                onChange={(e) =>
                  updateSlide(slide.index, { title: e.target.value })
                }
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 text-[15px] font-medium text-[#0d0d0d] outline-none transition placeholder:text-[#bbb] focus:border-black/20 focus:bg-white"
              />
              <select
                value={slide.layoutRole}
                aria-label="版式角色"
                onChange={(e) =>
                  updateSlide(slide.index, {
                    layoutRole: e.target.value as PptLayoutRole,
                  })
                }
                className="h-8 shrink-0 rounded-full border border-black/10 bg-white px-2.5 text-[13px] text-[#555] outline-none"
              >
                {LAYOUT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {PPT_LAYOUT_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`删除第 ${slide.index} 页`}
                disabled={slides.length <= MIN_PAGES}
                onClick={() => removeSlide(slide.index)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#bbb] transition hover:bg-black/[0.04] hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <textarea
              value={slide.bullets.join("\n")}
              placeholder="每行一条要点（建议 ≤5 条、每条 ≤20 字，文字会渲染进画面）"
              rows={Math.max(2, slide.bullets.length)}
              onChange={(e) =>
                updateSlide(slide.index, {
                  bullets: e.target.value
                    .split("\n")
                    .map((b) => b.slice(0, 40))
                    .slice(0, 6)
                    .filter((b, i, arr) => b !== "" || i < arr.length - 1 || arr.length === 1),
                })
              }
              className="mt-2.5 w-full resize-none rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 text-[14px] leading-6 text-[#333] outline-none transition placeholder:text-[#bbb] focus:border-black/20 focus:bg-white"
            />
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                disabled={slides.length >= MAX_PAGES}
                onClick={() => addSlide(slide.index)}
                className="flex items-center gap-1 text-[12px] text-[#bbb] transition hover:text-[#0d0d0d] disabled:opacity-0"
              >
                <Plus className="size-3.5" />
                在此后插入一页
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur">
        <span className="text-[13px] text-[#777]">
          共 {slides.length} 页 · 预扣{" "}
          <span className="font-semibold text-[#0d0d0d]">{estimatedCost}</span>{" "}
          积分
        </span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0d0d0d] px-5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? "创建任务中…" : "确认大纲，开始生成"}
        </button>
      </div>
    </div>
  );
}
