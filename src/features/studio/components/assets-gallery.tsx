"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { GenerationResult, VideoTask } from "../types";
import Lightbox from "./lightbox";
import { useStudio } from "../context/studio-context";

type Tab = "all" | "video" | "image";

const getStatusBadge = (status: VideoTask["status"], t: any) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    running: "bg-blue-100 text-blue-700",
    succeeded: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  const labels = {
    pending: t("status.pending"),
    running: t("status.running"),
    succeeded: t("status.succeeded"),
    error: t("status.error"),
  };

  return (
    <span
      className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

const GalleryGrid: React.FC<{
  items: GenerationResult[];
  t: any;
  onItemClick: (item: GenerationResult) => void;
}> = ({ items, t, onItemClick }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
    {items.map((item) => (
      <div
        key={item.id}
        className="group flex flex-col gap-4 cursor-pointer"
        onClick={() => onItemClick(item)}
      >
        <div className="relative aspect-square bg-[#faf9f6] overflow-hidden border border-[#e5e5e1]">
          {item.type === "video" ? (
            <video
              src={item.url}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            />
          ) : (
            <img
              src={item.url}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              alt=""
            />
          )}
          <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
            <div className="size-10 flex items-center justify-center text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors rounded-full">
              <span className="material-symbols-outlined text-sm">visibility</span>
            </div>
            <a
              href={item.url}
              download
              onClick={(e) => e.stopPropagation()}
              className="size-10 flex items-center justify-center text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors rounded-full"
            >
              <span className="material-symbols-outlined text-sm">download</span>
            </a>
          </div>
          <div className="absolute top-4 left-4 text-xs uppercase tracking-[0.2em] bg-white/90 px-2 py-1 text-[#1a1a1a] shadow-sm">
            {item.type === "video"
              ? t("assetType.video")
              : item.type === "image"
                ? t("assetType.image")
                : t("assetType.analysis")}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-semibold tracking-wide uppercase truncate">
            {item.prompt}
          </h4>
          <p className="text-xs text-[#4b5563] italic">
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
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#faf9f6] h-full font-sans">
      {lightboxItem && lightboxItem.url && (
        <Lightbox
          src={lightboxItem.url}
          type={lightboxItem.type}
          prompt={lightboxItem.prompt}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#e5e5e1] px-4 md:px-10 py-4 md:py-6 bg-white sticky top-0 z-10">
        <h2 className="text-base font-bold tracking-[0.2em] uppercase text-[#1a1a1a]">
          {t("header")}
        </h2>
        <div className="flex items-center gap-2 border-b border-[#e5e5e1] pb-1 w-full md:w-auto">
          <span className="material-symbols-outlined text-[18px] text-[#6b7280]">
            search
          </span>
          <input
            className="bg-transparent border-none text-sm focus:outline-none placeholder:text-[#4b5563]/50 w-full md:w-64 px-0"
            placeholder={t("searchPlaceholder")}
          />
        </div>
      </header>

      <div className="p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8 md:gap-12">
        <section className="flex flex-col gap-8">
          <div className="flex justify-between items-center border-b border-[#e5e5e1] overflow-x-auto">
            <div className="flex gap-4 md:gap-8 lg:gap-12">
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-4 border-b-2 text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] transition-colors whitespace-nowrap ${activeTab === "all" ? "border-[#1a1a1a] text-[#1a1a1a] font-bold" : "border-transparent text-[#4b5563] hover:text-[#1a1a1a]"}`}
              >
                {t("tabs.all")}
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`pb-4 border-b-2 text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] transition-colors whitespace-nowrap ${activeTab === "video" ? "border-[#1a1a1a] text-[#1a1a1a] font-bold" : "border-transparent text-[#4b5563] hover:text-[#1a1a1a]"}`}
              >
                {t("tabs.video")}
              </button>
              <button
                onClick={() => setActiveTab("image")}
                className={`pb-4 border-b-2 text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] transition-colors whitespace-nowrap ${activeTab === "image" ? "border-[#1a1a1a] text-[#1a1a1a] font-bold" : "border-transparent text-[#4b5563] hover:text-[#1a1a1a]"}`}
              >
                {t("tabs.images")}
              </button>
            </div>
          </div>

          {activeTab === "video" ? (
            <div className="flex flex-col gap-6">
              {videoTasks.filter(
                (t) => t.status === "pending" || t.status === "running"
              ).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-6">
                  <h4 className="text-sm font-bold text-blue-800 mb-4">
                    {t("tasks.active")}
                  </h4>
                  <div className="space-y-4">
                    {videoTasks
                      .filter(
                        (t) => t.status === "pending" || t.status === "running"
                      )
                      .map((task) => (
                        <div
                          key={task.id}
                          className="bg-white p-4 border border-blue-100"
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
                <div className="py-20 text-center text-[#4b5563] text-base font-normal">
                  {t("empty.noVideos")}
                </div>
              ) : (
                <GalleryGrid items={filteredHistory} t={t} onItemClick={setLightboxItem} />
              )}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-20 text-center text-[#4b5563] text-base font-normal">
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
