"use client";

import React, { useEffect, useId, useRef } from "react";
import { Copy, Download, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  src: string;
  type: "image" | "video" | "analysis";
  prompt?: string;
  onClose: () => void;
}

const Lightbox: React.FC<Props> = ({ src, type, prompt, onClose }) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileName = type === "video" ? "studio-video.mp4" : "studio-image.png";

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!src) return null;

  const handleCopyPrompt = async () => {
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("提示词已复制。");
    } catch {
      toast.error("复制失败，请手动复制提示词。");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101010]/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <h2 id={titleId} className="sr-only">
        作品预览
      </h2>
      <p id={descriptionId} className="sr-only">
        按 Escape 或关闭按钮退出预览。
      </p>

      <div
        className="absolute inset-x-3 top-3 z-50 flex items-start justify-between gap-3 md:inset-x-6 md:top-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 rounded-full bg-black/35 p-1 text-white backdrop-blur">
          {prompt && (
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              aria-label="复制提示词"
              title="复制提示词"
            >
              <Copy className="size-4" strokeWidth={1.9} />
            </button>
          )}
          <a
            href={src}
            download={fileName}
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            aria-label="下载作品"
            title="下载作品"
            onClick={(event) => event.stopPropagation()}
          >
            <Download className="size-4" strokeWidth={1.9} />
          </a>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            aria-label="打开原文件"
            title="打开原文件"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="size-4" strokeWidth={1.9} />
          </a>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="关闭预览"
          title="关闭预览"
        >
          <X className="size-5" strokeWidth={1.9} />
        </button>
      </div>

      <div
        className="flex size-full flex-col items-center justify-center p-4 sm:p-8 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          {type === "video" ? (
            <video
              src={src}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg bg-black object-contain shadow-2xl outline-none"
            />
          ) : (
            <img
              src={src}
              alt={prompt ? `作品预览：${prompt}` : "全屏预览"}
              className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
            />
          )}
        </div>
        {prompt && (
          <div className="mt-5 w-full max-w-3xl">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm md:px-5">
              <p className="mb-1 text-xs text-white/60">提示词</p>
              <p className="text-sm leading-6 text-white/90 md:text-base">
                {prompt}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
