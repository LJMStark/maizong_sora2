"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { GenerationResult, VideoTask } from "../types";
import Lightbox from "./lightbox";
import { useStudio } from "../context/studio-context";
import AdminSettings from "./admin-settings";
import { useSession } from "@/lib/auth/client";

type Tab = "all" | "video" | "image" | "credits";

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

const UserCenter: React.FC = () => {
  const t = useTranslations("studio.userCenter");
  const tCredits = useTranslations("studio.credits");
  const { state, addCredits, refreshCredits } = useStudio();
  const { data: session } = useSession();
  const [lightboxItem, setLightboxItem] = useState<GenerationResult | null>(
    null
  );
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<{
    type: "success" | "error" | null;
    msg: string;
  }>({ type: null, msg: "" });
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 检查用户是否是管理员
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      }
    };
    if (session?.user) {
      checkAdmin();
    }
  }, [session?.user]);

  const handleRedeem = async () => {
    if (!redeemCode) return;

    const validCodes: Record<string, number> = {
      NEWUSER: 50,
      VIP2025: 200,
      ELEPHANT: 500,
      DEMO: 1000,
    };

    const code = redeemCode.trim().toUpperCase();

    if (validCodes[code]) {
      const amount = validCodes[code];
      addCredits(amount, `${t("redeem.codePrefix")}${code}`);
      setRedeemStatus({
        type: "success",
        msg: t("redeem.success", { amount }),
      });
      setRedeemCode("");
      refreshCredits();
    } else {
      setRedeemStatus({
        type: "error",
        msg: t("redeem.error"),
      });
    }

    setTimeout(() => setRedeemStatus({ type: null, msg: "" }), 3000);
  };

  const filteredHistory = state.history.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "video") return item.type === "video";
    if (activeTab === "image")
      return item.type === "image" || item.type === "analysis";
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
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-serif text-[#1a1a1a] italic">
            {t("title")}
          </h1>
          <p className="text-[#4b5563] text-base font-normal tracking-wide max-w-xl">
            {t("subtitle")}
          </p>
        </div>

        <div className="bg-white border border-[#e5e5e1]">
          <div className="flex flex-col lg:flex-row">
            <div className="p-10 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-[#e5e5e1] flex flex-col items-center justify-center bg-[#faf9f6]/30">
              <div className="relative size-32 flex items-center justify-center rounded-full border-4 border-[#e5e5e1]">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-2xl font-serif text-[#1a1a1a]">
                    {state.credits}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-[#4b5563]">
                    {tCredits("balance")}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-10 lg:w-2/3 flex flex-col justify-between gap-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4b5563] mb-1">
                    {t("creditWallet.label")}
                  </p>
                  <h3 className="text-xl font-medium tracking-tight text-[#1a1a1a]">
                    {t("creditWallet.title")}
                  </h3>
                </div>
                <button className="bg-[#8C7355] hover:bg-[#2d3436] text-white px-8 py-3 text-sm uppercase tracking-[0.2em] transition-all font-medium shadow-md">
                  {t("creditWallet.recharge")}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {t("creditWallet.currentPlan")}
                  </p>
                  <p className="text-xs text-[#4b5563] uppercase tracking-wider mt-1">
                    {t("creditWallet.currentTier")}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {t("creditWallet.rolloverDate")}
                  </p>
                  <p className="text-xs text-[#4b5563] uppercase tracking-wider mt-1">
                    {t("creditWallet.nextRollover")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e5e5e1] pt-6 mt-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[#4b5563]">
                  {t("redeem.label")}
                </label>
                <div className="flex gap-2 max-w-md items-start">
                  <div className="flex-1 flex flex-col gap-1">
                    <input
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      placeholder={t("redeem.placeholder")}
                      className="bg-[#faf9f6] border border-[#e5e5e1] p-3 text-sm tracking-wider w-full focus:outline-none focus:border-[#1a1a1a] transition-colors uppercase"
                    />
                    {redeemStatus.msg && (
                      <p
                        className={`text-xs tracking-wide ${redeemStatus.type === "success" ? "text-green-600" : "text-red-500"}`}
                      >
                        {redeemStatus.msg}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleRedeem}
                    className="bg-[#1a1a1a] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#2d3436] transition-colors whitespace-nowrap shadow-sm"
                  >
                    {t("redeem.button")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AdminSettings isAdmin={isAdmin} />

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
              <button
                onClick={() => setActiveTab("credits")}
                className={`pb-4 border-b-2 text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] transition-colors whitespace-nowrap ${activeTab === "credits" ? "border-[#8C7355] text-[#8C7355] font-bold" : "border-transparent text-[#4b5563] hover:text-[#1a1a1a]"}`}
              >
                {t("tabs.credits")}
              </button>
            </div>
          </div>

          {activeTab === "credits" ? (
            <div className="bg-white border border-[#e5e5e1] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#faf9f6] border-b border-[#e5e5e1]">
                  <tr>
                    <th className="py-4 px-6 text-xs uppercase tracking-[0.15em] font-bold text-[#4b5563]">
                      {t("table.dateTime")}
                    </th>
                    <th className="py-4 px-6 text-xs uppercase tracking-[0.15em] font-bold text-[#4b5563]">
                      {t("table.details")}
                    </th>
                    <th className="py-4 px-6 text-xs uppercase tracking-[0.15em] font-bold text-[#4b5563] text-right">
                      {t("table.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.creditHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-12 text-center text-[#4b5563] text-base font-normal"
                      >
                        {t("table.noTransactions")}
                      </td>
                    </tr>
                  ) : (
                    state.creditHistory.map((txn) => (
                      <tr
                        key={txn.id}
                        className="border-b border-[#e5e5e1] hover:bg-[#faf9f6]/50 transition-colors group"
                      >
                        <td className="py-4 px-6 text-sm text-[#4b5563] font-mono">
                          {txn.date.toLocaleDateString()}{" "}
                          <span className="opacity-50 ml-1">
                            {txn.date.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-base font-medium text-[#1a1a1a]">
                            {txn.reason}
                          </span>
                        </td>
                        <td
                          className={`py-4 px-6 text-right text-base font-bold font-mono ${txn.type === "deduction" ? "text-[#1a1a1a]" : "text-green-600"}`}
                        >
                          {txn.type === "deduction" ? "-" : "+"}
                          {txn.amount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === "video" ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col gap-4 cursor-pointer"
                      onClick={() => setLightboxItem(item)}
                    >
                      <div className="relative aspect-square bg-[#faf9f6] overflow-hidden border border-[#e5e5e1]">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                          <div className="size-10 flex items-center justify-center text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors rounded-full">
                            <span className="material-symbols-outlined text-sm">
                              visibility
                            </span>
                          </div>
                          <a
                            href={item.url}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="size-10 flex items-center justify-center text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors rounded-full"
                          >
                            <span className="material-symbols-outlined text-sm">
                              download
                            </span>
                          </a>
                        </div>
                        <div className="absolute top-4 left-4 text-xs uppercase tracking-[0.2em] bg-white/90 px-2 py-1 text-[#1a1a1a] shadow-sm">
                          {t("assetType.video")}
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
              )}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-20 text-center text-[#4b5563] text-base font-normal">
              {t("empty.noAssets")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col gap-4 cursor-pointer"
                  onClick={() => setLightboxItem(item)}
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
                        alt="资源"
                      />
                    )}
                    <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                      <div className="size-10 flex items-center justify-center text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors rounded-full">
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                      </div>
                      <a
                        href={item.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="size-10 flex items-center justify-center text-[#1a1a1a] border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors rounded-full"
                      >
                        <span className="material-symbols-outlined text-sm">
                          download
                        </span>
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
          )}
        </section>
      </div>
    </div>
  );
};

export default UserCenter;
