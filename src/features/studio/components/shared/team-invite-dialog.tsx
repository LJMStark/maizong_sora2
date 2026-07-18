"use client";

import React from "react";
import {
  Check,
  Copy,
  Link as LinkIcon,
  Mail,
  Shield,
  UserPlus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/clipboard";
import { isEmail } from "@/lib/validations/email";

interface TeamInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string | null;
}

type InviteRole = "editor" | "viewer";

interface PendingInvite {
  email: string;
  role: InviteRole;
}

const roleLabels: Record<InviteRole, string> = {
  editor: "可创作",
  viewer: "仅查看",
};

function getInviteUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/signup?invite=studio`;
}

export function TeamInviteDialog({
  open,
  onOpenChange,
  userEmail,
}: TeamInviteDialogProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<InviteRole>("editor");
  const [pendingInvites, setPendingInvites] = React.useState<PendingInvite[]>([]);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCopied(false);
  }, [open]);

  const inviteUrl = getInviteUrl();
  const trimmedEmail = email.trim().toLowerCase();
  const canAddInvite =
    isEmail(trimmedEmail) &&
    !pendingInvites.some((item) => item.email === trimmedEmail);

  const handleAddInvite = () => {
    if (!isEmail(trimmedEmail)) {
      toast.error("请输入有效邮箱。");
      return;
    }
    if (pendingInvites.some((item) => item.email === trimmedEmail)) {
      toast.info("这个邮箱已在邀请清单里。");
      return;
    }

    setPendingInvites((items) => [...items, { email: trimmedEmail, role }]);
    setEmail("");
    toast.success("已加入邀请清单。");
  };

  const handleCopyLink = async () => {
    try {
      await copyTextToClipboard(inviteUrl);
      setCopied(true);
      toast.success("邀请链接已复制。");
    } catch {
      setCopied(false);
      toast.error("复制失败，请手动复制链接。");
    }
  };

  const handleCopySummary = async () => {
    const lines = [
      "小象万象团队邀请",
      `邀请链接：${inviteUrl}`,
      pendingInvites.length > 0
        ? `邀请清单：${pendingInvites
            .map((item) => `${item.email}（${roleLabels[item.role]}）`)
            .join("、")}`
        : "邀请清单：暂无",
    ];

    try {
      await copyTextToClipboard(lines.join("\n"));
      toast.success("邀请信息已复制。");
    } catch {
      toast.error("复制失败，请手动复制邀请链接。");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="team-invite"
        className="max-h-[calc(100vh-32px)] gap-0 overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-w-[620px]"
      >
        <DialogTitle className="sr-only">邀请成员</DialogTitle>
        <div className="flex max-h-[calc(100vh-32px)] flex-col">
          <div className="border-b border-[#eeeeee] px-6 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                <UserPlus className="size-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-medium leading-7 text-[#0d0d0d]">
                  邀请成员
                </p>
                <p className="mt-1 text-sm leading-5 text-[#666]">
                  分享邀请链接，或先整理要邀请的邮箱。
                </p>
              </div>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#eeeeee] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f7f7f7] text-[#666]">
                    <LinkIcon className="size-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0d0d0d]">
                      邀请链接
                    </p>
                    <p className="mt-1 select-all break-all rounded-xl bg-[#f7f7f7] px-3 py-2 font-mono text-xs leading-5 text-[#555]">
                      {inviteUrl}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
                    >
                      {copied ? (
                        <Check className="size-4" strokeWidth={1.9} />
                      ) : (
                        <Copy className="size-4" strokeWidth={1.9} />
                      )}
                      {copied ? "已复制" : "复制链接"}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Mail className="size-4 text-[#777]" strokeWidth={1.9} />
                  <h3 className="text-sm font-medium leading-5 text-[#0d0d0d]">
                    邮箱清单
                  </h3>
                </div>
                <div className="rounded-2xl border border-[#eeeeee] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      placeholder="name@example.com"
                      onChange={(event) => setEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddInvite();
                        }
                      }}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-[#d9d9d9] bg-white px-3 text-sm text-[#0d0d0d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
                      aria-label="邀请邮箱"
                    />
                    <div className="flex gap-2">
                      {(["editor", "viewer"] as InviteRole[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setRole(item)}
                          className={cn(
                            "h-10 rounded-xl border px-3 text-sm transition",
                            role === item
                              ? "border-[#0d0d0d] bg-[#f7f7f7] text-[#0d0d0d]"
                              : "border-[#d9d9d9] text-[#555] hover:bg-black/[0.03]"
                          )}
                          aria-pressed={role === item}
                        >
                          {roleLabels[item]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddInvite}
                      disabled={!canAddInvite}
                      className="h-10 rounded-xl bg-[#0d0d0d] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:bg-[#d7d7d7]"
                    >
                      添加
                    </button>
                  </div>

                  <div className="mt-3 min-h-[92px] rounded-xl bg-[#f7f7f7] p-2">
                    {pendingInvites.length === 0 ? (
                      <div className="flex h-[76px] items-center justify-center text-sm text-[#777]">
                        还没有添加邮箱
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {pendingInvites.map((item) => (
                          <div
                            key={item.email}
                            className="flex min-h-10 items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#0d0d0d]">
                                {item.email}
                              </p>
                              <p className="text-xs leading-4 text-[#777]">
                                {roleLabels[item.role]}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingInvites((items) =>
                                  items.filter((invite) => invite.email !== item.email)
                                )
                              }
                              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#777] hover:bg-black/5 hover:text-[#0d0d0d]"
                              aria-label={`移除 ${item.email}`}
                            >
                              <X className="size-4" strokeWidth={1.9} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#eeeeee] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f7f7f7] text-[#666]">
                    <Shield className="size-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0d0d0d]">
                      当前管理员
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#666]">
                      {userEmail || "当前账号"} 可以管理邀请清单。正式邮件发送接入后，将从这里继续完成。
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#eeeeee] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-[#555] transition hover:bg-black/[0.04]"
            >
              <Copy className="size-4" strokeWidth={1.9} />
              复制邀请信息
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-full bg-[#0d0d0d] px-5 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
            >
              完成
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
