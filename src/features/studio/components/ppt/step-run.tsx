"use client";

import React, { useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPptSkill } from "@/features/studio/data/ppt-skills";
import type { PptTaskSnapshot, PptSlideSnapshot } from "./types";

interface StepRunProps {
  snapshot: PptTaskSnapshot;
  isActing: boolean;
  onConfirmSample: () => void;
  onRegenerateSample: (params: {
    styleKey?: string;
    anchorColor?: string;
    promptOverride?: string;
  }) => void;
  onCancel: () => void;
}

function SlideTile({ slide }: { slide: PptSlideSnapshot }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#f0f0f0]">
      <div className="relative aspect-video w-full">
        {slide.status === "succeeded" && slide.finalImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.finalImageUrl}
            alt={slide.title}
            className="absolute inset-0 size-full object-cover"
          />
        ) : slide.status === "running" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#999]">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-[11px]">
              {slide.retryCount > 0 ? `第 ${slide.retryCount + 1} 次尝试` : "生成中"}
            </span>
          </div>
        ) : slide.status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50 px-2 text-center">
            <span className="text-[12px] font-medium text-red-500">生成失败</span>
            {slide.refunded && (
              <span className="text-[10px] text-red-400">已退款</span>
            )}
          </div>
        ) : slide.status === "cancelled" ? (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[#bbb]">
            已取消
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[#bbb]">
            等待中
          </div>
        )}
      </div>
      <span className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
        {slide.slideIndex}
      </span>
    </div>
  );
}

export function StepRun({
  snapshot,
  isActing,
  onConfirmSample,
  onRegenerateSample,
  onCancel,
}: StepRunProps) {
  const [showRegenPanel, setShowRegenPanel] = useState(false);
  const [regenStyleKey, setRegenStyleKey] = useState(snapshot.styleKey);
  const [regenAnchorColor, setRegenAnchorColor] = useState<string | null>(
    snapshot.anchorColor
  );
  const [promptOverride, setPromptOverride] = useState("");

  const skill = getPptSkill(snapshot.skillKey);
  const regenStyle = skill?.styles.find((s) => s.key === regenStyleKey);
  const sampleSlide = snapshot.slides.find((s) => s.slideIndex === 1);
  const isAwaitingConfirm = snapshot.status === "awaiting_confirm";
  const { succeeded, failed, total } = snapshot.progress;
  const doneCount = succeeded + failed;
  const progressPercent = Math.round((doneCount / total) * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-[#0d0d0d]">
            {snapshot.title}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#999]">
            {isAwaitingConfirm
              ? "样张已生成，确认风格后继续"
              : snapshot.status === "generating_sample"
                ? "正在生成样张（第 1 页）…"
                : `正在生成 第 ${snapshot.progress.currentIndex ?? "-"} / ${total} 页`}
          </p>
        </div>
        <button
          type="button"
          disabled={isActing}
          onClick={onCancel}
          className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 text-[13px] text-[#666] transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <X className="size-3.5" />
          中止并退还未生成页
        </button>
      </div>

      {!isAwaitingConfirm && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-[#0d0d0d] transition-all duration-500"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-[#999]">
            已完成 {succeeded} 页
            {failed > 0 && <span className="text-red-400">，失败 {failed} 页（已退款）</span>}
            ，共 {total} 页
          </p>
        </div>
      )}

      {isAwaitingConfirm && sampleSlide && (
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-xl bg-[#111]">
            <div className="relative aspect-video w-full">
              {sampleSlide.finalImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sampleSlide.finalImageUrl}
                  alt="样张"
                  className="absolute inset-0 size-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
                  <span className="text-[14px]">样张生成失败（已退款）</span>
                  {sampleSlide.errorMessage && (
                    <span className="text-[12px] text-white/40">
                      {sampleSlide.errorMessage}
                    </span>
                  )}
                  <span className="text-[12px] text-white/40">
                    可换风格重试，或直接继续生成剩余页
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              disabled={isActing}
              onClick={onConfirmSample}
              className="flex h-10 items-center gap-2 rounded-full bg-[#0d0d0d] px-5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40"
            >
              {isActing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              确认风格，继续生成 {total - 1} 页
            </button>
            <button
              type="button"
              disabled={isActing}
              onClick={() => setShowRegenPanel((prev) => !prev)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border px-5 text-[14px] transition disabled:opacity-40",
                showRegenPanel
                  ? "border-[#0d0d0d] bg-black/[0.04] text-[#0d0d0d]"
                  : "border-black/10 bg-white text-[#555] hover:bg-black/[0.04]"
              )}
            >
              <RefreshCw className="size-4" />
              重生成样张（-{snapshot.creditCostPerPage} 积分）
            </button>
          </div>

          {showRegenPanel && (
            <div className="mx-auto mt-4 max-w-2xl space-y-3 rounded-xl bg-[#fafafa] p-4">
              {skill && skill.styles.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-[#777]">换风格</span>
                  {skill.styles.map((style) => {
                    const active = style.key === regenStyleKey;
                    return (
                      <button
                        key={style.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setRegenStyleKey(style.key);
                          setRegenAnchorColor(null);
                        }}
                        className={cn(
                          "h-8 rounded-full px-3.5 text-[13px] transition",
                          active
                            ? "bg-[#0d0d0d] font-medium text-white"
                            : "border border-black/10 bg-white text-[#555] hover:bg-black/[0.04]"
                        )}
                      >
                        {style.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {regenStyle?.anchorColors && regenStyle.anchorColors.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-[#777]">锚点色</span>
                  {regenStyle.anchorColors.map((color) => {
                    const active = regenAnchorColor === color.hex;
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        aria-pressed={active}
                        title={color.name}
                        onClick={() =>
                          setRegenAnchorColor(active ? null : color.hex)
                        }
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition",
                          active
                            ? "border-[#0d0d0d] bg-white text-[#0d0d0d]"
                            : "border-black/10 bg-white text-[#666]"
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
              <textarea
                value={promptOverride}
                onChange={(e) => setPromptOverride(e.target.value)}
                placeholder="对样张的额外要求（可选），例如：标题更大、配图换成插画"
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[13px] leading-5 outline-none transition placeholder:text-[#bbb] focus:border-black/30"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() =>
                    onRegenerateSample({
                      styleKey:
                        regenStyleKey !== snapshot.styleKey
                          ? regenStyleKey
                          : undefined,
                      anchorColor: regenAnchorColor ?? undefined,
                      promptOverride: promptOverride.trim() || undefined,
                    })
                  }
                  className="flex h-9 items-center gap-2 rounded-full bg-[#0d0d0d] px-4 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-40"
                >
                  {isActing && <Loader2 className="size-3.5 animate-spin" />}
                  确认重生成
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {snapshot.slides.map((slide) => (
          <SlideTile key={slide.slideIndex} slide={slide} />
        ))}
      </div>
    </div>
  );
}
