"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatYuan } from "@/lib/format";

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
  const [copied, setCopied] = useState(false);

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
      setCopied(false);
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
    setCopied(false);
    onOpenChange(false);
  };

  if (!selectedPackage) return null;

  const paymentSummary = orderId
    ? [
        `订单号：${orderId}`,
        `套餐：${selectedPackage.name}`,
        `金额：${formatYuan(selectedPackage.price)}`,
        "请联系客服完成支付和开通。",
      ].join("\n")
    : "";

  const handleCopyOrder = async () => {
    if (!paymentSummary) return;

    try {
      await navigator.clipboard.writeText(paymentSummary);
      setCopied(true);
      toast.success("订单信息已复制。");
    } catch {
      toast.error("复制失败，请手动复制订单号。");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-studio-dialog-surface="credit-purchase"
        className="max-h-[min(720px,calc(100vh-32px))] gap-0 overflow-y-auto rounded-2xl border border-[#e5e5e5] bg-white p-0 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-md"
      >
        <DialogHeader className="px-5 pb-0 pt-5 text-left">
          <DialogTitle className="text-xl font-medium text-[#0d0d0d]">
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#777]">
            确认套餐后会生成订单号，请联系客服完成支付和开通。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-5">
          <div className="rounded-2xl bg-[#f7f7f7]">
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
                <span className="text-sm text-[#777]">
                  {t("packageLabel")}
                </span>
                <span className="font-medium text-[#0d0d0d]">
                  {selectedPackage.name}
                </span>
              </div>

              {selectedPackage.type === "package" && (
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
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
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <span className="text-sm text-[#777]">
                      月初始
                    </span>
                    <span className="font-medium text-[#0d0d0d]">
                      {selectedPackage.credits ?? 0} 积分/月
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
                    <span className="text-sm text-[#777]">
                      {t("durationLabel")}
                    </span>
                    <span className="font-medium text-[#0d0d0d]">
                      {selectedPackage.durationDays} 天
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
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
                <span className="text-xl font-medium text-[#0d0d0d]">
                  {formatYuan(selectedPackage.price)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#f7f7f7] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#0d0d0d]">
                  {orderId ? "订单已生成" : "下一步"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#777]">
                  {orderId
                    ? "复制订单信息后发给客服，管理员确认后会为账号开通。"
                    : "生成订单号后，复制订单信息给客服完成支付和开通。"}
                </p>
              </div>
              {orderId && (
                <button
                  type="button"
                  onClick={handleCopyOrder}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#d9d9d9] bg-white px-3 text-xs font-medium text-[#0d0d0d] hover:bg-[#f7f7f7]"
                >
                  {copied ? (
                    <Check className="size-3.5" strokeWidth={2} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.9} />
                  )}
                  {copied ? "已复制" : "复制"}
                </button>
              )}
            </div>
            <div className="mt-3 rounded-2xl border border-[#e5e5e5] bg-white p-3">
              <p className="mb-2 text-xs font-medium text-[#777]">
                {orderId ? "付款备注" : t("orderNote")}
              </p>
              {loading ? (
                <p className="font-mono text-lg tracking-wider text-[#777]">
                  生成中...
                </p>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <p className="font-mono text-lg tracking-wider text-[#0d0d0d]">
                  {orderId || "确认后生成订单号"}
                </p>
              )}
            </div>
            {orderId && (
              <p className="mt-3 text-xs leading-5 text-[#777]">
                订单信息只用于人工确认支付和开通，不会自动扣款。
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 px-5 pb-5 pt-0 sm:gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 flex-1 rounded-full border border-[#d9d9d9] px-5 text-sm font-medium text-[#555] transition-colors hover:bg-[#f7f7f7] hover:text-[#0d0d0d]"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={orderId ? handleClose : handleConfirm}
            disabled={loading}
            className="h-10 flex-1 rounded-full bg-[#0d0d0d] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "生成中..." : orderId ? t("confirm") : t("createOrder")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
