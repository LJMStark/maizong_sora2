"use client";

import React from "react";
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
  credits?: number;
  dailyCredits?: number;
  durationDays?: number;
  price: number;
}

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPackage: Package | null;
}

function formatPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

function generateOrderId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${dateStr}${random}`;
}

export function CreditPurchaseDialog({
  open,
  onOpenChange,
  selectedPackage,
}: CreditPurchaseDialogProps) {
  const t = useTranslations("studio.subscription.purchase");
  const [orderId] = React.useState(() => generateOrderId());

  if (!selectedPackage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                      {t("durationLabel")}
                    </span>
                    <span className="text-[#1a1a1a] font-medium">
                      {selectedPackage.durationDays} 天
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[#e5e5e1] pb-4">
                    <span className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
                      {t("dailyLabel")}
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
              <p className="font-mono text-lg tracking-wider text-[#8C7355]">
                {orderId}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 sm:gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-4 px-6 border border-[#e5e5e1] text-[#4b5563] text-[12px] font-bold uppercase tracking-widest hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-4 px-6 bg-[#8C7355] text-white text-[12px] font-bold uppercase tracking-widest hover:bg-[#7a6349] transition-colors"
          >
            {t("confirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
