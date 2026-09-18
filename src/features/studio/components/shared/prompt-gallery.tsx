"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useInfiniteSentinel } from "../../hooks/use-infinite-sentinel";

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
  /** 首屏先渲染的条目数，其余随滚动预取 */
  initialCount?: number;
  /** 栏目切换时通知（用于按需拉取 CDN 数据） */
  onCategoryChange?: (key: string) => void;
  loading?: boolean;
  emptyLabel?: string;
}

const DEFAULT_INITIAL_COUNT = 23;

const LOAD_MORE_SIZE = 24;

/**
 * 灵感库卡片缩略图。
 *
 * 本地与远程都走 `next/image`：灵感库素材的地址是**稳定的公开链接**
 * （`/object/public/...`，不带签名），所以优化结果能被正常缓存——
 * 这一点和用户作品不同，后者的签名 token 每次请求都变，只能改为在签发时
 * 做变换（见 `components/shared/asset-thumbnail.tsx` 的说明）。
 *
 * 发布管线已经把素材压到 640px JPEG（43-110KB），`next/image` 再按实际渲染
 * 尺寸出 AVIF，可以进一步降到十几 KB 量级。
 *
 * `onError` 兜底：远程域名一旦不在 `next.config.ts` 的白名单里，`next/image`
 * 不会降级而是直接失败、整片空白。白名单已经把 CDN 覆盖地址算进去了，
 * 这里再留一层回退，避免配置漂移时整个灵感库变白。
 */
function GalleryThumb({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [optimizeFailed, setOptimizeFailed] = useState(false);

  const className =
    "object-cover transition duration-200 group-hover/card:scale-[1.03]";
  // 卡片在移动端约占三分之一屏宽，桌面端固定 190px
  const sizes = "(max-width: 640px) 33vw, 190px";

  if (optimizeFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- next/image 失败后的兜底，见上方注释
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 size-full", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setOptimizeFailed(true)}
    />
  );
}

export function PromptGallery({
  categories,
  items,
  onSelect,
  leadingTile,
  initialCount = DEFAULT_INITIAL_COUNT,
  onCategoryChange,
  loading = false,
  emptyLabel = "这个分类还没有示例",
}: PromptGalleryProps) {
  const [activeKey, setActiveKey] = useState(categories[0]?.key ?? "");
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const filtered = items.filter((item) => item.category === activeKey);
  const visible = filtered.slice(0, visibleCount);
  const hiddenCount = filtered.length - visible.length;
  const canLoadMore = hiddenCount > 0 && !loading;

  const loadMore = useCallback(() => {
    setVisibleCount((count) => count + LOAD_MORE_SIZE);
  }, []);

  const sentinelRef = useInfiniteSentinel<HTMLDivElement>({
    enabled: canLoadMore,
    onIntersect: loadMore,
    observeKey: `${activeKey}:${visibleCount}:${filtered.length}`,
  });

  const handleCategoryChange = (key: string) => {
    setActiveKey(key);
    setVisibleCount(initialCount);
    onCategoryChange?.(key);
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
            className="group/card min-w-0 text-left [content-visibility:auto] [contain-intrinsic-size:auto_280px]"
          >
            <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-[#f6f6f6]">
              <GalleryThumb src={item.image} alt={item.title} />
              <span className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-black/[0.06] transition group-hover/card:ring-black/[0.12]" />
            </span>
            <span className="mt-2.5 block truncate text-center text-[14px] leading-5 text-[#777] transition group-hover/card:text-[#0d0d0d]">
              {item.title}
            </span>
          </button>
        ))}
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="min-w-0">
              <div className="aspect-[3/4] w-full animate-pulse rounded-[20px] bg-[#f0f0f0]" />
              <div className="mx-auto mt-2.5 h-5 w-16 animate-pulse rounded bg-[#f0f0f0]" />
            </div>
          ))}
      </div>

      {!loading && filtered.length === 0 && !leadingTile && (
        <p className="mt-8 text-center text-sm text-[#8a8a8a]">{emptyLabel}</p>
      )}

      {canLoadMore && (
        <div
          ref={sentinelRef}
          className="mt-6 flex justify-center"
          aria-live="polite"
        >
          <p className="text-xs text-[#b0b0b0]">下滑查看更多 · 剩余 {hiddenCount}</p>
        </div>
      )}
    </div>
  );
}
