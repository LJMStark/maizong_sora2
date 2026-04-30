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
      <DialogContent className="gap-0 rounded-[18px] border border-[#e5e5e5] bg-white p-0 sm:max-w-md">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-[26px] font-normal text-[#0d0d0d]">
            {t("dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="rounded-[18px] border border-[#e5e5e5] bg-[#f7f7f7]">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <span className="text-sm text-[#777]">
                  {t("packageLabel")}
                </span>
                <span className="font-medium text-[#0d0d0d]">
                  {selectedPackage.name}
                </span>
              </div>

              {selectedPackage.type === "package" && (
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                  <span className="text-sm text-[#777]">
                    {t("creditsLabel")}
                  </span>
                  <span className="font-medium text-[#0d0d0d]">
                    {selectedPackage.credits}
                  </span>
                </div>
              )}

              {selectedPackage.type === "subscription" && (
                <>
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                    <span className="text-sm text-[#777]">
                      月初始
                    </span>
                    <span className="font-medium text-[#0d0d0d]">
                      {selectedPackage.credits ?? 0} 积分/月
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                    <span className="text-sm text-[#777]">
                      {t("durationLabel")}
                    </span>
                    <span className="font-medium text-[#0d0d0d]">
                      {selectedPackage.durationDays} 天
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                    <span className="text-sm text-[#777]">
                      每日赠送
                    </span>
                    <span className="font-medium text-[#0d0d0d]">
                      {selectedPackage.dailyCredits} 积分/天
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-[#777]">
                  {t("priceLabel")}
                </span>
                <span className="text-2xl font-medium text-[#0d0d0d]">
                  {formatPrice(selectedPackage.price)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <p className="text-sm text-[#777]">{t("contactInfo")}</p>
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-[#f7f7f7]">
              <span className="text-xs text-[#777]">
                客服微信二维码
              </span>
            </div>
            <div className="rounded-[18px] border border-[#e5e5e5] bg-[#f7f7f7] p-4">
              <p className="mb-2 text-xs text-[#777]">
                {t("orderNote")}
              </p>
              {loading ? (
                <p className="font-mono text-lg tracking-wider text-[#777]">
                  生成中...
                </p>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <p className="font-mono text-lg tracking-wider text-[#0d0d0d]">
                  {orderId}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 p-6 pt-0 sm:gap-3">
          <button
            onClick={handleClose}
            className="h-12 flex-1 rounded-full border border-[#d9d9d9] px-6 text-[16px] font-medium text-[#777] transition-colors hover:bg-[#f7f7f7] hover:text-[#0d0d0d]"
          >
            {t("cancel")}
          </button>
          <button
            onClick={orderId ? handleClose : handleConfirm}
            disabled={loading}
            className="h-12 flex-1 rounded-full bg-[#0d0d0d] px-6 text-[16px] font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "生成中..." : orderId ? t("confirm") : t("createOrder")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
