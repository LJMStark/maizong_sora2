"use client";

import React from "react";
import { Building2, Check, Copy, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { copyTextToClipboard } from "@/lib/clipboard";
import { isEmail } from "@/lib/validations/email";
import { dispatchStudioEvent, STUDIO_MODAL_OPENED_EVENT } from "../utils/studio-events";

type TeamSize = "2-5" | "6-20" | "21-50" | "50+";

interface BusinessContactPlan {
  name: string;
  subtitle: string;
  price: string;
}

interface BusinessContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: BusinessContactPlan | null;
  userEmail?: string | null;
}

const teamSizeOptions: TeamSize[] = ["2-5", "6-20", "21-50", "50+"];

function buildRequestId() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, "0");
  return `BIZ-${stamp}-${suffix}`;
}

export function BusinessContactDialog({
  open,
  onOpenChange,
  plan,
  userEmail,
}: BusinessContactDialogProps) {
  const [email, setEmail] = React.useState("");
  const [teamSize, setTeamSize] = React.useState<TeamSize>("6-20");
  const [needs, setNeeds] = React.useState("");
  const [requestId, setRequestId] = React.useState("");

  React.useEffect(() => {
    if (!open) return;

    dispatchStudioEvent(STUDIO_MODAL_OPENED_EVENT);
    setEmail(userEmail ?? "");
    setTeamSize("6-20");
    setNeeds("");
    setRequestId(buildRequestId());
  }, [open, userEmail]);

  if (!plan) return null;

  const trimmedEmail = email.trim();
  const canSubmit = isEmail(trimmedEmail);

  const summary = [
    "小象万象团队采购申请",
    `申请编号：${requestId}`,
    `方案：${plan.name}`,
    `用途：${plan.subtitle}`,
    `预算方式：${plan.price}`,
    `联系邮箱：${trimmedEmail || "未填写"}`,
    `团队人数：${teamSize}`,
    `需求说明：${needs.trim() || "未填写"}`,
  ].join("\n");

  const handleCopy = async () => {
    if (!canSubmit) {
      toast.error("请输入有效邮箱。");
      return;
    }

    try {
      await copyTextToClipboard(summary);
      toast.success("团队采购申请已复制。");
    } catch {
      toast.error("复制失败，请手动复制申请信息。");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="business-contact"
        className="max-h-[min(720px,calc(100vh-32px))] gap-0 overflow-y-auto rounded-2xl border border-[#e5e5e5] bg-white p-0 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-[620px]"
      >
        <DialogHeader className="px-5 pb-0 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-medium text-[#0d0d0d]">
            <Building2 className="size-5" strokeWidth={1.9} />
            团队采购
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#777]">
            整理团队用量和联系方式，复制申请信息后交给管理员确认额度、订单和发票。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <section className="rounded-2xl bg-[#f7f7f7] p-4">
            <p className="text-sm text-[#777]">所选方案</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-2xl font-medium leading-8 text-[#0d0d0d]">
                  {plan.name}
                </p>
                <p className="mt-1 text-sm leading-5 text-[#555]">
                  {plan.subtitle}
                </p>
              </div>
              <p className="text-sm font-medium text-[#0d0d0d]">
                {plan.price}
              </p>
            </div>
            <p className="mt-3 rounded-xl bg-white px-3 py-2 font-mono text-xs leading-5 text-[#555]">
              {requestId}
            </p>
          </section>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-[#0d0d0d]">
              <Mail className="size-4 text-[#777]" strokeWidth={1.9} />
              联系邮箱
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              className="h-11 w-full rounded-full border border-[#d9d9d9] bg-white px-4 text-sm text-[#0d0d0d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
            />
          </label>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-[#0d0d0d]">
              <Users className="size-4 text-[#777]" strokeWidth={1.9} />
              团队人数
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {teamSizeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTeamSize(option)}
                  className={[
                    "flex h-10 items-center justify-center rounded-full border px-3 text-sm font-medium transition",
                    teamSize === option
                      ? "border-[#0d0d0d] bg-[#0d0d0d] text-white"
                      : "border-[#d9d9d9] bg-white text-[#555] hover:bg-[#f7f7f7]",
                  ].join(" ")}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#0d0d0d]">
              需求说明
            </span>
            <textarea
              value={needs}
              onChange={(event) => setNeeds(event.target.value)}
              rows={4}
              maxLength={800}
              placeholder="例如：3 个设计师共用额度，需要月度发票，主要做商品图和短视频。"
              className="min-h-[116px] w-full resize-none rounded-2xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
            />
          </label>
        </div>

        <DialogFooter className="gap-2 px-5 pb-5 pt-0 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 rounded-full border border-[#d9d9d9] px-5 text-sm font-medium text-[#555] transition-colors hover:bg-[#f7f7f7] hover:text-[#0d0d0d]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleCopy()}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#0d0d0d] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:bg-[#d7d7d7]"
          >
            {canSubmit ? (
              <Copy className="size-4" strokeWidth={1.9} />
            ) : (
              <Check className="size-4" strokeWidth={1.9} />
            )}
            复制申请信息
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
