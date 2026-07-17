"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PromptGalleryItem {
  id: string;
  title: string;
  category: string;
  prompt: string;
  image: string;
}

export interface PromptGalleryCategory {
  key: string;
  label: string;
}

interface PromptGalleryProps {
  categories: readonly PromptGalleryCategory[];
  items: readonly PromptGalleryItem[];
  onSelect: (item: PromptGalleryItem) => void;
  /** 固定显示在网格首位的自定义卡片（如上传入口） */
  leadingTile?: React.ReactNode;
  /** 收起状态下最多显示的条目数 */
  initialCount?: number;
}

const DEFAULT_INITIAL_COUNT = 11;

export function PromptGallery({
  categories,
  items,
  onSelect,
  leadingTile,
  initialCount = DEFAULT_INITIAL_COUNT,
}: PromptGalleryProps) {
  const [activeKey, setActiveKey] = useState(categories[0]?.key ?? "");
  const [expanded, setExpanded] = useState(false);

  const filtered = items.filter((item) => item.category === activeKey);
  const visible = expanded ? filtered : filtered.slice(0, initialCount);
  const hiddenCount = filtered.length - visible.length;

  const handleCategoryChange = (key: string) => {
    setActiveKey(key);
    setExpanded(false);
  };

  return (
    <div>
      <div
        aria-label="提示词分类"
        className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {categories.map((category) => {
          const active = category.key === activeKey;
          return (
            <button
              key={category.key}
              type="button"
              aria-pressed={active}
              onClick={() => handleCategoryChange(category.key)}
              className={cn(
                "h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm transition",
                active
                  ? "bg-[#0d0d0d] font-medium text-white"
                  : "border border-black/10 bg-white text-[#555] hover:bg-black/[0.04]"
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:gap-x-4 lg:grid-cols-5 xl:grid-cols-6">
        {leadingTile}
        {visible.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item)}
            title={item.title}
            className="group/card min-w-0 text-left"
          >
            <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f6f6f6]">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 33vw, 190px"
                className="object-cover transition duration-200 group-hover/card:scale-[1.03]"
              />
              <span className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-black/[0.06] transition group-hover/card:ring-black/[0.12]" />
            </span>
            <span className="mt-2.5 block truncate text-center text-[14px] leading-5 text-[#777] transition group-hover/card:text-[#0d0d0d]">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      {(hiddenCount > 0 || expanded) && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 text-sm text-[#555] transition hover:bg-black/[0.04]"
          >
            {expanded ? "收起" : `展开全部 ${filtered.length} 条`}
            <ChevronDown
              className={cn("size-4 transition-transform", expanded && "rotate-180")}
            />
          </button>
        </div>
      )}
    </div>
  );
}
