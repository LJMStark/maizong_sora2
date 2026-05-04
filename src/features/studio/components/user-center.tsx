"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useStudio } from "../context/studio-context";
import AdminSettings from "./admin-settings";
import RedemptionCodeManager from "./redemption-code-manager";
import { useSession } from "@/lib/auth/client";
import { isAdmin as checkIsAdmin } from "../utils/user-helpers";

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
  const isAdmin = checkIsAdmin(session?.user);

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
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-white font-sans text-[#0d0d0d]">
      <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-[#e5e5e5] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <h2 className="text-[22px] font-medium leading-none text-[#0d0d0d]">
          {t("header")}
        </h2>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[35px] font-normal leading-tight text-[#0d0d0d]">
            {t("title")}
          </h1>
          <p className="max-w-xl text-[16px] leading-6 text-[#777]">
            {t("subtitle")}
          </p>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex flex-col lg:flex-row">
            <div className="flex flex-col items-center justify-center border-b border-[#e5e5e5] bg-[#f7f7f7] p-10 lg:w-1/3 lg:border-b-0 lg:border-r">
              <div className="relative flex size-32 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[34px] font-medium leading-none text-[#0d0d0d]">
                    {state.credits}
                  </span>
                  <span className="mt-2 text-sm text-[#777]">
                    {tCredits("balance")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 md:p-10 lg:w-2/3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-1 text-sm text-[#777]">
                    {t("creditWallet.label")}
                  </p>
                  <h3 className="text-[22px] font-medium tracking-tight text-[#0d0d0d]">
                    {t("creditWallet.title")}
                  </h3>
                </div>
                <button className="h-11 rounded-full bg-[#0d0d0d] px-6 text-[16px] font-medium text-white transition hover:bg-[#2a2a2a]">
                  {t("creditWallet.recharge")}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <p className="text-[16px] font-medium text-[#0d0d0d]">
                    {t("creditWallet.currentPlan")}
                  </p>
                  <p className="mt-1 text-sm text-[#777]">
                    {t("creditWallet.currentTier")}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[16px] font-medium text-[#0d0d0d]">
                    {t("creditWallet.rolloverDate")}
                  </p>
                  <p className="mt-1 text-sm text-[#777]">
                    {t("creditWallet.nextRollover")}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-3 border-t border-[#e5e5e5] pt-6">
                <label className="text-sm font-medium text-[#0d0d0d]">
                  {t("redeem.label")}
                </label>
                <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="flex flex-1 flex-col gap-1">
                    <input
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      placeholder={t("redeem.placeholder")}
                      className="h-12 w-full rounded-full border border-[#d9d9d9] bg-white px-5 text-[16px] uppercase shadow-none outline-none transition-colors focus:border-[#4d6fb6] focus:ring-4 focus:ring-[#4d6fb6]/20"
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
                    className="h-12 whitespace-nowrap rounded-full bg-[#0d0d0d] px-6 text-[16px] font-medium text-white transition-colors hover:bg-[#2a2a2a]"
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
          <h3 className="border-b border-[#e5e5e5] pb-4 text-[22px] font-medium text-[#0d0d0d]">
            {t("tabs.credits")}
          </h3>
          <div className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-[#e5e5e5] bg-[#f7f7f7]">
                <tr>
                  <th className="px-6 py-4 text-sm font-medium text-[#777]">
                    {t("table.dateTime")}
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-[#777]">
                    {t("table.details")}
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-[#777]">
                    {t("table.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.creditHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-12 text-center text-base font-normal text-[#777]"
                    >
                      {t("table.noTransactions")}
                    </td>
                  </tr>
                ) : (
                  state.creditHistory.map((txn) => (
                    <tr
                      key={txn.id}
                      className="group border-b border-[#eeeeee] transition-colors hover:bg-[#f7f7f7]"
                    >
                      <td className="px-6 py-4 font-mono text-sm text-[#777]">
                        {txn.date.toLocaleDateString()}{" "}
                        <span className="opacity-50 ml-1">
                          {txn.date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base font-medium text-[#0d0d0d]">
                          {txn.reason}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono text-base font-bold ${txn.type === "deduction" ? "text-[#0d0d0d]" : "text-green-600"}`}
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
