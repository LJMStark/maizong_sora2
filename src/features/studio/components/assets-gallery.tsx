"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, Search } from "lucide-react";
import { GenerationResult, VideoTask } from "../types";
import Lightbox from "./lightbox";
import { useStudio } from "../context/studio-context";

type Tab = "all" | "video" | "image";
type UserCenterTranslator = ReturnType<typeof useTranslations>;

const getStatusBadge = (status: VideoTask["status"], t: UserCenterTranslator) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    running: "bg-blue-100 text-blue-700",
    retrying: "bg-amber-100 text-amber-700",
    succeeded: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  const labels = {
    pending: t("status.pending"),
    running: t("status.running"),
    retrying: t("status.running"),
    succeeded: t("status.succeeded"),
    error: t("status.error"),
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

const GalleryGrid: React.FC<{
  items: GenerationResult[];
  t: UserCenterTranslator;
  onItemClick: (item: GenerationResult) => void;
}> = ({ items, t, onItemClick }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {items.map((item) => (
      <div
        key={item.id}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white"
        onClick={() => onItemClick(item)}
      >
        <div className="relative aspect-square overflow-hidden bg-[#f4f4f4]">
          {item.type === "video" ? (
            <video
              src={item.url}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <img
              src={item.url}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              alt=""
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-white text-[#0d0d0d] shadow-sm hover:bg-[#f7f7f7]"
              aria-label="查看"
            >
              <Eye className="size-5" strokeWidth={1.9} />
            </button>
            <a
              href={item.url}
              download
              onClick={(e) => e.stopPropagation()}
              className="flex size-10 items-center justify-center rounded-full bg-white text-[#0d0d0d] shadow-sm hover:bg-[#f7f7f7]"
              aria-label="下载"
            >
              <Download className="size-5" strokeWidth={1.9} />
            </a>
          </div>
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#0d0d0d] shadow-sm backdrop-blur">
            {item.type === "video"
              ? t("assetType.video")
              : item.type === "image"
                ? t("assetType.image")
              : t("assetType.analysis")}
          </div>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3">
          <h4 className="truncate text-[15px] font-medium text-[#0d0d0d]">
            {item.prompt}
          </h4>
          <p className="text-sm text-[#777]">
            {item.createdAt.toLocaleDateString()}
          </p>
        </div>
      </div>
    ))}
  </div>
);

const AssetsGallery: React.FC = () => {
  const t = useTranslations("studio.userCenter");
  const { state } = useStudio();
  const [lightboxItem, setLightboxItem] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const filteredHistory = state.history.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "video") return item.type === "video";
    if (activeTab === "image") return item.type === "image" || item.type === "analysis";
    return false;
  });

  const videoTasks = state.videoTasks || [];

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-white font-sans text-[#0d0d0d]">
      {lightboxItem && lightboxItem.url && (
        <Lightbox
          src={lightboxItem.url}
          type={lightboxItem.type}
          prompt={lightboxItem.prompt}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-[#e5e5e5] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <h2 className="text-[22px] font-medium leading-none text-[#0d0d0d]">
          {t("header")}
        </h2>
        <div className="flex h-11 w-full items-center gap-3 rounded-full bg-[#f4f4f4] px-4 md:w-80">
          <Search className="size-5 text-[#777]" strokeWidth={1.9} />
          <input
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#777]"
            placeholder={t("searchPlaceholder")}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
        <section className="flex flex-col gap-8">
          <div className="overflow-x-auto">
            <div className="flex w-max rounded-full bg-[#f0f0f0] p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`h-10 rounded-full px-5 text-[16px] transition whitespace-nowrap ${activeTab === "all" ? "bg-white text-[#0d0d0d] shadow-sm" : "text-[#777] hover:text-[#0d0d0d]"}`}
              >
                {t("tabs.all")}
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`h-10 rounded-full px-5 text-[16px] transition whitespace-nowrap ${activeTab === "video" ? "bg-white text-[#0d0d0d] shadow-sm" : "text-[#777] hover:text-[#0d0d0d]"}`}
              >
                {t("tabs.video")}
              </button>
              <button
                onClick={() => setActiveTab("image")}
                className={`h-10 rounded-full px-5 text-[16px] transition whitespace-nowrap ${activeTab === "image" ? "bg-white text-[#0d0d0d] shadow-sm" : "text-[#777] hover:text-[#0d0d0d]"}`}
              >
                {t("tabs.images")}
              </button>
            </div>
          </div>

          {activeTab === "video" ? (
            <div className="flex flex-col gap-6">
              {videoTasks.filter(
                (t) =>
                  t.status === "pending" ||
                  t.status === "running" ||
                  t.status === "retrying"
              ).length > 0 && (
                <div className="rounded-[18px] border border-[#d5e7ff] bg-[#f5f9ff] p-6">
                  <h4 className="mb-4 text-sm font-medium text-[#0757a6]">
                    {t("tasks.active")}
                  </h4>
                  <div className="space-y-4">
                    {videoTasks
                      .filter(
                        (t) =>
                          t.status === "pending" ||
                          t.status === "running" ||
                          t.status === "retrying"
                      )
                      .map((task) => (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-[#dcecff] bg-white p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm text-[#1a1a1a] truncate max-w-[200px]">
                              {task.prompt}
                            </p>
                            {getStatusBadge(task.status, t)}
                          </div>
                          <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-[#4b5563] mt-2">
                            {t("tasks.complete", { progress: task.progress })}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {filteredHistory.length === 0 &&
              videoTasks.filter((t) => t.status === "succeeded").length ===
                0 ? (
                <div className="py-20 text-center text-base font-normal text-[#777]">
                  {t("empty.noVideos")}
                </div>
              ) : (
                <GalleryGrid items={filteredHistory} t={t} onItemClick={setLightboxItem} />
              )}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-20 text-center text-base font-normal text-[#777]">
              {t("empty.noAssets")}
            </div>
          ) : (
            <GalleryGrid items={filteredHistory} t={t} onItemClick={setLightboxItem} />
          )}
        </section>
      </div>
    </div>
  );
};

export default AssetsGallery;
