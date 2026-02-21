"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Package {
  id: string;
  name: string;
  type: "package" | "subscription";
  credits?: number | null;
  dailyCredits?: number | null;
  durationDays?: number | null;
  price: number;
}

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: Package | null;
  onUnauthorized?: () => void;
}

function formatPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

export function CreditPurchaseDialog({
  open,
  onOpenChange,
  selectedPackage,
  onUnauthorized,
}: CreditPurchaseDialogProps) {
  const t = useTranslations("studio.subscription.purchase");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          onUnauthorized?.();
          if (!onUnauthorized) {
            setError("请先登录后再创建订单");
          }
          return;
        }

        throw new Error(
          data.error || `创建订单失败（状态码 ${res.status}）`
        );
      }

      setOrderId(data.orderId);
    } catch (err) {
      console.error("创建订单失败:", err);
      const detail = err instanceof Error ? err.message : String(err);
      setError(`创建订单失败：${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOrderId(null);
    setError(null);
    onOpenChange(false);
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border border-[#e5e5e1] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-serif text-2xl italic text-[#1a1a1a] font-normal">
            {t("dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="border border-[#e5e5e1] bg-[#faf9f6]">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#e5e5e1] pb-4">
                <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                  {t("packageLabel")}
                </span>
                <span className="font-serif italic text-[#1a1a1a]">
                  {selectedPackage.name}
                </span>
              </div>

              {selectedPackage.type === "package" && (
                <div className="flex justify-between items-center border-b border-[#e5e5e1] pb-4">
                  <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                    {t("creditsLabel")}
                  </span>
                  <span className="text-[#1a1a1a] font-medium">
                    {selectedPackage.credits}
                  </span>
                </div>
              )}

              {selectedPackage.type === "subscription" && (
                <>
                  <div className="flex justify-between items-center border-b border-[#e5e5e1] pb-4">
                    <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                      月初始
                    </span>
                    <span className="text-[#1a1a1a] font-medium">
                      {selectedPackage.credits ?? 0} 积分/月
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#e5e5e1] pb-4">
                    <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                      {t("durationLabel")}
                    </span>
                    <span className="text-[#1a1a1a] font-medium">
                      {selectedPackage.durationDays} 天
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#e5e5e1] pb-4">
                    <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                      每日赠送
                    </span>
                    <span className="text-[#8C7355] font-medium">
                      {selectedPackage.dailyCredits} 积分/天
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                  {t("priceLabel")}
                </span>
                <span className="text-2xl font-light text-[#1a1a1a]">
                  {formatPrice(selectedPackage.price)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-[#4b5563]">{t("contactInfo")}</p>
            <div className="mx-auto flex h-40 w-40 items-center justify-center border border-[#e5e5e1] bg-[#faf9f6]">
              <span className="text-xs text-[#4b5563] uppercase tracking-wider">
                客服微信二维码
              </span>
            </div>
            <div className="bg-[#faf9f6] border border-[#e5e5e1] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-[#4b5563] mb-2">
                {t("orderNote")}
              </p>
              {loading ? (
                <p className="font-mono text-lg tracking-wider text-[#4b5563]">
                  生成中...
                </p>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <p className="font-mono text-lg tracking-wider text-[#8C7355]">
                  {orderId}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 sm:gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-4 px-6 border border-[#e5e5e1] text-[#4b5563] text-[12px] font-bold uppercase tracking-widest hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={orderId ? handleClose : handleConfirm}
            disabled={loading}
            className="flex-1 py-4 px-6 bg-[#8C7355] text-white text-[12px] font-bold uppercase tracking-widest hover:bg-[#7a6349] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "生成中..." : orderId ? t("confirm") : t("createOrder")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
