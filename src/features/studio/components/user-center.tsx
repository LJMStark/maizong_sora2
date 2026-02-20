"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useStudio } from "../context/studio-context";
import AdminSettings from "./admin-settings";
import RedemptionCodeManager from "./redemption-code-manager";
import { useSession } from "@/lib/auth/client";

const UserCenter: React.FC = () => {
  const t = useTranslations("studio.userCenter");
  const tCredits = useTranslations("studio.credits");
  const { state, refreshCredits } = useStudio();
  const { data: session } = useSession();
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<{
    type: "success" | "error" | null;
    msg: string;
  }>({ type: null, msg: "" });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 检查用户是否是管理员
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        setIsAdmin(res.ok);
      } catch (error) {
        console.error("检查管理员权限失败:", error);
        setIsAdmin(false);
      }
    };
    if (session?.user) {
      checkAdmin();
    }
  }, [session?.user]);

  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!redeemCode || isRedeeming) return;

    setIsRedeeming(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setRedeemStatus({
          type: "success",
          msg: t("redeem.success", { amount: data.credits }),
        });
        setRedeemCode("");
        refreshCredits();
      } else {
        const serverMessage =
          typeof data.error === "string" ? data.error : "";
        const isInvalidCodeError =
          res.status === 400 ||
          serverMessage.includes("兑换码") ||
          serverMessage.includes("格式");
        setRedeemStatus({
          type: "error",
          msg: isInvalidCodeError
            ? serverMessage || t("redeem.error")
            : `兑换失败：${serverMessage || "请稍后重试"}`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("兑换码请求失败:", error);
      setRedeemStatus({
        type: "error",
        msg: `网络错误，请检查连接后重试：${message}`,
      });
    } finally {
      setIsRedeeming(false);
    }

    setTimeout(() => setRedeemStatus({ type: null, msg: "" }), 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-[#faf9f6] h-full font-sans">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#e5e5e1] px-4 md:px-10 py-4 md:py-6 bg-white sticky top-0 z-10">
        <h2 className="text-base font-bold tracking-[0.2em] uppercase text-[#1a1a1a]">
          {t("header")}
        </h2>
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

        <RedemptionCodeManager isAdmin={isAdmin} />

        <section className="flex flex-col gap-8">
          <h3 className="text-lg font-medium text-[#1a1a1a] border-b border-[#e5e5e1] pb-4">
            {t("tabs.credits")}
          </h3>
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
        </section>
      </div>
    </div>
  );
};

export default UserCenter;
