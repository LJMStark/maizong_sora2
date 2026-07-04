"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ImageOff, Search, X } from "lucide-react";
import { GenerationResult } from "../types";

interface Props {
  history: GenerationResult[];
  onSelect: (url: string) => void;
  onClose: () => void;
}

const AssetPicker: React.FC<Props> = ({ history, onSelect, onClose }) => {
  const t = useTranslations("studio.assetPicker");
  const titleId = useId();
  const descriptionId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const assets = history.filter((item) => {
    const isImageAsset = (item.type === "image" || item.type === "analysis") && item.url;
    if (!isImageAsset) return false;
    if (!query) return true;
    return (
      item.prompt.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 backdrop-blur-sm sm:items-center md:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-studio-dialog-surface="asset-picker"
        className="flex max-h-[min(720px,92vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#ececec] px-4 py-4 md:px-5">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-medium text-[#0d0d0d] md:text-xl">
              {t("title")}
            </h3>
            <p id={descriptionId} className="mt-1 text-sm leading-5 text-[#777]">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#777] transition-colors hover:bg-black/5 hover:text-[#0d0d0d]"
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-[#ececec] px-4 py-3 md:px-5">
          <div className="flex h-10 items-center gap-3 rounded-full bg-[#f4f4f4] px-4">
            <Search className="size-4 text-[#777]" strokeWidth={1.9} />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索作品"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#777]"
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-4 md:p-5">
          {assets.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-[#777]">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#f4f4f4]">
                <ImageOff className="size-5" strokeWidth={1.9} />
              </div>
              <p className="text-sm">
                {query ? "没有匹配的作品" : t("empty")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {assets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.url) {
                      onSelect(item.url);
                      onClose();
                    }
                  }}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#f4f4f4] text-left transition hover:border-[#cfcfcf] focus:outline-none focus:ring-4 focus:ring-black/10"
                >
                  <img
                    src={item.url}
                    alt={item.prompt}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                  <div className="absolute bottom-2 left-2 right-2 translate-y-2 rounded-xl bg-white/95 px-2.5 py-2 opacity-0 shadow-sm backdrop-blur transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="truncate text-xs font-medium text-[#0d0d0d]">
                      {item.type === "analysis" ? "image" : item.type}
                    </p>
                    <p className="truncate text-xs text-[#777]">{item.prompt}</p>
                  </div>
                  <div className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/95 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    <Check className="size-4 text-[#0d0d0d]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetPicker;
