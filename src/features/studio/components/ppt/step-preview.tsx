"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PptTaskSnapshot } from "./types";
import {
  exportLongImage,
  exportPdf,
  exportPptx,
  exportZip,
  type ExportSlide,
} from "./ppt-export";

type ExportFormat = "pptx" | "pdf" | "zip" | "long";

const EXPORT_LABELS: Record<ExportFormat, string> = {
  pptx: "PPTX",
  pdf: "PDF",
  zip: "PNG 打包",
  long: "长图",
};

interface StepPreviewProps {
  snapshot: PptTaskSnapshot;
  regeneratingIndex: number | null;
  isGeneratingSpeech: boolean;
  onRegenerateSlide: (slideIndex: number) => void;
  onGenerateSpeech: () => void;
  onStartNew: () => void;
}

export function StepPreview({
  snapshot,
  regeneratingIndex,
  isGeneratingSpeech,
  onRegenerateSlide,
  onGenerateSpeech,
  onStartNew,
}: StepPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(1);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportProgress, setExportProgress] = useState("");
  const [isPresenting, setIsPresenting] = useState(false);

  const succeededSlides = useMemo(
    () =>
      snapshot.slides.filter(
        (s) => s.status === "succeeded" && s.finalImageUrl
      ),
    [snapshot.slides]
  );

  const activeSlide =
    snapshot.slides.find((s) => s.slideIndex === activeIndex) ??
    snapshot.slides[0];

  const goRelative = useCallback(
    (delta: number) => {
      setActiveIndex((prev) => {
        const next = prev + delta;
        return Math.min(Math.max(next, 1), snapshot.pageCount);
      });
    },
    [snapshot.pageCount]
  );

  // 键盘翻页（预览与演示模式共用）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goRelative(-1);
      else if (e.key === "ArrowRight" || e.key === " ") goRelative(1);
      else if (e.key === "Escape") setIsPresenting(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goRelative]);

  // 演示模式进入/退出全屏
  useEffect(() => {
    if (isPresenting) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [isPresenting]);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsPresenting(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    if (succeededSlides.length === 0) {
      toast.error("没有可导出的页面");
      return;
    }
    const exportSlides: ExportSlide[] = succeededSlides.map((s) => ({
      slideIndex: s.slideIndex,
      title: s.title,
      finalImageUrl: s.finalImageUrl!,
      speechNotes: s.speechNotes,
    }));

    setExporting(format);
    setExportProgress("");
    const onProgress = (done: number, total: number) =>
      setExportProgress(`${done}/${total}`);

    try {
      if (format === "pptx") await exportPptx(exportSlides, snapshot.title, onProgress);
      else if (format === "pdf") await exportPdf(exportSlides, snapshot.title, onProgress);
      else if (format === "zip") await exportZip(exportSlides, snapshot.title, onProgress);
      else await exportLongImage(exportSlides, snapshot.title, onProgress);
      toast.success(`${EXPORT_LABELS[format]} 导出完成`);
    } catch (error) {
      console.error("[PPT Export] 导出失败:", error);
      toast.error(
        `导出失败：${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setExporting(null);
      setExportProgress("");
    }
  };

  if (isPresenting) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        onClick={() => goRelative(1)}
      >
        {activeSlide?.finalImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeSlide.finalImageUrl}
            alt={activeSlide.title}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-white/60">本页未生成</span>
        )}
        <span className="absolute bottom-4 right-5 rounded-full bg-white/10 px-3 py-1 text-[13px] text-white/70">
          {activeIndex} / {snapshot.pageCount} · ESC 退出
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-[#0d0d0d]">
            {snapshot.title}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#999]">
            {snapshot.status === "partial"
              ? `${snapshot.progress.succeeded}/${snapshot.pageCount} 页成功，失败页已退款，可单页重生成`
              : `共 ${snapshot.pageCount} 页 · ${snapshot.resolution.toUpperCase()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPresenting(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 text-[13px] text-[#333] transition hover:bg-black/[0.04]"
          >
            <Play className="size-3.5" />
            演示
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="flex h-9 items-center rounded-full border border-black/10 bg-white px-4 text-[13px] text-[#333] transition hover:bg-black/[0.04]"
          >
            再做一套
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-[#111]">
        <div className="relative aspect-video w-full">
          {activeSlide?.finalImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeSlide.finalImageUrl}
              alt={activeSlide.title}
              className="absolute inset-0 size-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
              {regeneratingIndex === activeSlide?.slideIndex ? (
                <>
                  <Loader2 className="size-6 animate-spin" />
                  <span className="text-[13px]">重新生成中…</span>
                </>
              ) : (
                <>
                  <span className="text-[14px]">本页生成失败</span>
                  {activeSlide?.errorMessage && (
                    <span className="max-w-md px-6 text-center text-[12px] text-white/40">
                      {activeSlide.errorMessage}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="上一页"
          onClick={() => goRelative(-1)}
          className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="下一页"
          onClick={() => goRelative(1)}
          className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
        >
          <ChevronRight className="size-5" />
        </button>
        <span className="absolute bottom-3 right-4 rounded-full bg-black/50 px-2.5 py-1 text-[12px] text-white/80">
          {activeIndex} / {snapshot.pageCount}
        </span>
        {activeSlide && (
          <button
            type="button"
            disabled={regeneratingIndex !== null}
            onClick={() => onRegenerateSlide(activeSlide.slideIndex)}
            className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[12px] text-white/80 transition hover:bg-black/70 disabled:opacity-50"
          >
            {regeneratingIndex === activeSlide.slideIndex ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            重生成此页（-{snapshot.creditCostPerPage} 积分）
          </button>
        )}
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {snapshot.slides.map((slide) => (
          <button
            key={slide.slideIndex}
            type="button"
            onClick={() => setActiveIndex(slide.slideIndex)}
            className={cn(
              "relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-[#f0f0f0] ring-2 transition",
              slide.slideIndex === activeIndex
                ? "ring-[#0d0d0d]"
                : "ring-transparent hover:ring-black/20"
            )}
          >
            {slide.finalImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.finalImageUrl}
                alt={slide.title}
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-[11px] text-[#c33]">
                失败
              </span>
            )}
            <span className="absolute bottom-0.5 left-1 rounded bg-black/50 px-1 text-[10px] text-white">
              {slide.slideIndex}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="flex items-center gap-1.5 text-[14px] font-medium text-[#0d0d0d]">
            <Download className="size-4" />
            导出下载
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(EXPORT_LABELS) as ExportFormat[]).map((format) => (
              <button
                key={format}
                type="button"
                disabled={exporting !== null || succeededSlides.length === 0}
                onClick={() => void handleExport(format)}
                className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-[14px] text-[#333] transition hover:border-black/30 hover:bg-black/[0.03] disabled:opacity-50"
              >
                {exporting === format ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {exportProgress || "导出中…"}
                  </>
                ) : (
                  <>
                    {format === "pptx" && <FileText className="size-4" />}
                    {EXPORT_LABELS[format]}
                  </>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[#999]">
            PPTX 为图片全幅幻灯片（含演讲备注）；长图适合公众号/小红书分享
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[14px] font-medium text-[#0d0d0d]">
              <Mic className="size-4" />
              演讲备注
            </h3>
            <button
              type="button"
              disabled={isGeneratingSpeech}
              onClick={onGenerateSpeech}
              className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-[12px] text-[#555] transition hover:bg-black/[0.04] disabled:opacity-50"
            >
              {isGeneratingSpeech && <Loader2 className="size-3 animate-spin" />}
              {snapshot.slides.some((s) => s.speechNotes) ? "重新生成" : "生成备注"}
            </button>
          </div>
          <p className="mt-3 max-h-44 overflow-y-auto whitespace-pre-wrap text-[13px] leading-6 text-[#555]">
            {activeSlide?.speechNotes || "本页暂无备注，点击「生成备注」由 AI 撰写。"}
          </p>
        </div>
      </div>
    </div>
  );
}
