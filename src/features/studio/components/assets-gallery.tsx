"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CirclePlay,
  Download,
  Eye,
  Grid2X2,
  ImageIcon,
  Plus,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { GenerationResult, VideoTask } from "../types";
import Lightbox from "./lightbox";
import { useStudio } from "../context/studio-context";
import { cn } from "@/lib/utils";

type Tab = "all" | "video" | "image";

const TAB_CONFIG: Array<{ value: Tab; icon: React.ElementType; label: string }> = [
  { value: "all", icon: Grid2X2, label: "全部" },
  { value: "image", icon: ImageIcon, label: "图像" },
  { value: "video", icon: Video, label: "视频" },
];

const QUICK_ACTIONS = [
  {
    href: "/studio",
    label: "新建图像",
    icon: ImageIcon,
    primary: true,
  },
  {
    href: "/studio/video",
    label: "生成视频",
    icon: Video,
    primary: false,
  },
];

function subscribeHydration() {
  return () => undefined;
}

function getHydratedClientSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

function formatAssetDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function getAssetTypeLabel(type: GenerationResult["type"]) {
  if (type === "video") return "视频";
  if (type === "analysis") return "分析";
  return "图像";
}

function getStatusBadge(status: VideoTask["status"]) {
  const styles = {
    pending: "bg-[#fff7d6] text-[#7a5a00]",
    running: "bg-[#e7f0ff] text-[#1555a8]",
    retrying: "bg-[#fff0d9] text-[#8a4b00]",
    succeeded: "bg-[#e7f7ed] text-[#16733a]",
    error: "bg-[#ffe8e8] text-[#b42318]",
  };

  const labels = {
    pending: "等待中",
    running: "处理中",
    retrying: "重试中",
    succeeded: "已完成",
    error: "失败",
  };

  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", styles[status])}
    >
      {labels[status]}
    </span>
  );
}

function QuickActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {QUICK_ACTIONS.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
              item.primary
                ? "bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
                : "border border-[#dedede] bg-white text-[#0d0d0d] hover:bg-[#f7f7f7]"
            )}
          >
            {item.primary ? (
              <Plus className="size-4" strokeWidth={1.9} />
            ) : (
              <Icon className="size-4" strokeWidth={1.9} />
            )}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveTasks({ tasks }: { tasks: VideoTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <section className="rounded-[22px] border border-[#eeeeee] bg-[#fcfcfc]">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-medium text-[#0d0d0d]">正在生成</h2>
        <span className="text-xs text-[#777]">{tasks.length}</span>
      </div>
      <div className="divide-y divide-[#eeeeee]">
        {tasks.map((task) => (
          <div key={task.id} className="px-4 py-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-[#1a1a1a]">
                {task.prompt}
              </p>
              {getStatusBadge(task.status)}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eeeeee]">
              <div
                className="h-full rounded-full bg-[#0d0d0d] transition-all duration-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#777]">{task.progress}% 完成</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GalleryGrid({
  items,
  onItemClick,
}: {
  items: GenerationResult[];
  onItemClick: (item: GenerationResult) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => {
        const shapeClass =
          item.type === "video"
            ? "aspect-[4/5]"
            : index % 7 === 0
              ? "aspect-[4/5]"
              : index % 7 === 3
                ? "aspect-[5/4]"
                : "aspect-square";
        const mediaUrl = item.url;

        return (
          <article key={item.id} className="group min-w-0">
            <div className={cn("relative overflow-hidden rounded-[22px] bg-[#f4f4f4]", shapeClass)}>
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className="block size-full text-left"
                disabled={!mediaUrl}
                aria-label={`查看${getAssetTypeLabel(item.type)}`}
              >
                {item.type === "video" ? (
                  <video
                    src={mediaUrl}
                    preload="metadata"
                    className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    alt=""
                  />
                )}
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="absolute inset-x-2 top-2 flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onItemClick(item)}
                    className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#0d0d0d] shadow-sm backdrop-blur hover:bg-white"
                    aria-label="查看"
                  >
                    <Eye className="size-4" strokeWidth={1.9} />
                  </button>
                  {mediaUrl && (
                    <a
                      href={mediaUrl}
                      download
                      className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#0d0d0d] shadow-sm backdrop-blur hover:bg-white"
                      aria-label="下载"
                    >
                      <Download className="size-4" strokeWidth={1.9} />
                    </a>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "absolute bottom-2 max-w-[calc(100%-16px)] truncate rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white opacity-0 backdrop-blur transition group-hover:opacity-100",
                  item.type === "video" ? "left-12" : "left-2"
                )}
              >
                {getAssetTypeLabel(item.type)}
              </span>
              {item.type === "video" && (
                <span className="absolute bottom-2 left-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur">
                  <CirclePlay className="size-4" strokeWidth={1.9} />
                </span>
              )}
            </div>
            <div className="mt-2.5 min-w-0 px-1">
              <h3 className="truncate text-[13px] font-medium leading-5 text-[#0d0d0d]">
                {item.prompt}
              </h3>
              <p className="mt-0.5 text-xs text-[#8a8a8a]">
                {formatAssetDate(item.createdAt)}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EmptyState({
  query,
  activeTab,
  onClearSearch,
}: {
  query: string;
  activeTab: Tab;
  onClearSearch: () => void;
}) {
  const emptyTitle = query
    ? "没有找到匹配的作品"
    : activeTab === "video"
      ? "还没有视频"
      : activeTab === "image"
        ? "还没有图像"
        : "还没有作品";
  const emptyDescription = query
    ? "换个关键词，或切换类型后再试。"
    : "生成完成的图片和视频会出现在这里。";

  return (
    <section className="flex min-h-[430px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative mb-6 h-[96px] w-[154px]" aria-hidden>
        <div className="absolute left-2 top-5 h-16 w-16 rotate-[-8deg] rounded-[22px] bg-[#f2f2f2]" />
        <div className="absolute left-12 top-0 h-20 w-16 rotate-[6deg] rounded-[22px] bg-[#eeeeee]" />
        <div className="absolute right-2 top-6 flex h-16 w-16 rotate-[10deg] items-center justify-center rounded-[22px] bg-[#f5f5f5]">
          <Sparkles className="size-5 text-[#8a8a8a]" strokeWidth={1.8} />
        </div>
      </div>
      <h2 className="text-[17px] font-medium leading-6 text-[#0d0d0d]">
        {emptyTitle}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#777]">
        {emptyDescription}
      </p>
      {query ? (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white hover:bg-[#2a2a2a]"
        >
          <X className="size-4" strokeWidth={1.9} />
          清除搜索
        </button>
      ) : (
        <QuickActions className="mt-5 justify-center" />
      )}
    </section>
  );
}

const AssetsGallery: React.FC = () => {
  const { state } = useStudio();
  const [lightboxItem, setLightboxItem] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot
  );

  const visibleHistory = useMemo(
    () => (hydrated ? state.history : []),
    [hydrated, state.history]
  );
  const visibleVideoTasks = useMemo(
    () => (hydrated ? state.videoTasks || [] : []),
    [hydrated, state.videoTasks]
  );
  const query = search.trim().toLowerCase();

  const filteredHistory = useMemo(
    () =>
      visibleHistory.filter((item) => {
        const matchesType =
          activeTab === "video"
            ? item.type === "video"
            : activeTab === "image"
              ? item.type === "image" || item.type === "analysis"
              : true;
        const matchesSearch =
          !query ||
          item.prompt.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query);
        return matchesType && matchesSearch;
      }),
    [activeTab, query, visibleHistory]
  );

  const totalAssets = visibleHistory.length;
  const imageCount = visibleHistory.filter(
    (item) => item.type === "image" || item.type === "analysis"
  ).length;
  const videoCount = visibleHistory.filter((item) => item.type === "video").length;
  const activeVideoTasks = visibleVideoTasks.filter(
    (task) =>
      task.status === "pending" ||
      task.status === "running" ||
      task.status === "retrying"
  );

  const showEmpty = filteredHistory.length === 0;
  const currentCount = filteredHistory.length;

  return (
    <div className="custom-scrollbar flex h-full flex-1 flex-col overflow-y-auto bg-white font-sans text-[#0d0d0d]">
      {lightboxItem && lightboxItem.url && (
        <Lightbox
          src={lightboxItem.url}
          type={lightboxItem.type}
          prompt={lightboxItem.prompt}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <div className="mx-auto flex w-full max-w-[980px] flex-col px-4 pb-14 pt-5 md:px-8 md:pt-8">
        <header className="mb-5 flex flex-col gap-4 md:mb-7 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-normal md:text-[32px]">
              作品库
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-[#777]">
              <span>{totalAssets} 个作品</span>
              <span aria-hidden>·</span>
              <span>{imageCount} 张图像</span>
              <span aria-hidden>·</span>
              <span>{videoCount} 个视频</span>
              {activeVideoTasks.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{activeVideoTasks.length} 个生成中</span>
                </>
              )}
            </div>
          </div>
          <QuickActions className="hidden md:flex" />
        </header>

        <div className="sticky top-0 z-10 -mx-2 rounded-b-[26px] bg-white/95 px-2 pb-4 pt-1 backdrop-blur md:mx-0 md:rounded-none md:px-0">
          <div className="rounded-[28px] border border-[#ededed] bg-[#fcfcfc] p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="flex h-12 w-full min-w-0 items-center gap-3 rounded-full bg-white px-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] md:flex-1">
                <Search className="size-5 shrink-0 text-[#777]" strokeWidth={1.9} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#777]"
                  placeholder="搜索作品"
                  aria-label="搜索作品"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#777] hover:bg-[#f4f4f4] hover:text-[#0d0d0d]"
                    aria-label="清除搜索"
                  >
                    <X className="size-4" strokeWidth={1.9} />
                  </button>
                )}
              </label>

              <div className="scrollbar-none overflow-x-auto">
                <div className="flex w-max gap-1 rounded-full bg-[#f1f1f1] p-1">
                  {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;

                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          "flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm transition",
                          activeTab === tab.value
                            ? "bg-white text-[#0d0d0d] shadow-sm"
                            : "text-[#6f6f6f] hover:text-[#0d0d0d]"
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.9} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-7">
          <ActiveTasks tasks={activeVideoTasks} />

          {showEmpty ? (
            <EmptyState
              query={query}
              activeTab={activeTab}
              onClearSearch={() => setSearch("")}
            />
          ) : (
            <section className="pt-1">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#777]">
                  显示 {currentCount} 个结果
                </p>
                <QuickActions className="md:hidden" />
              </div>
              <GalleryGrid items={filteredHistory} onItemClick={setLightboxItem} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetsGallery;
