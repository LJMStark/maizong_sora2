"use client";

import { Keyboard, Search, SquarePen, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutGroups = [
  {
    title: "导航",
    items: [
      {
        label: "搜索创作记录",
        keys: ["⌘", "K"],
        icon: Search,
      },
      {
        label: "新建创作",
        keys: ["⌘", "⇧", "O"],
        icon: SquarePen,
      },
      {
        label: "聚焦输入框",
        keys: ["/"],
        icon: Wand2,
      },
    ],
  },
  {
    title: "编辑",
    items: [
      {
        label: "发送提示词",
        keys: ["Enter"],
        icon: Keyboard,
      },
      {
        label: "换行",
        keys: ["⇧", "Enter"],
        icon: Keyboard,
      },
      {
        label: "关闭弹窗或菜单",
        keys: ["Esc"],
        icon: Keyboard,
      },
    ],
  },
];

function Keycap({ value }: { value: string }) {
  return (
    <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-[#d9d9d9] bg-[#f7f7f7] px-2 font-mono text-xs font-medium text-[#0d0d0d] shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
      {value}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="keyboard-shortcuts"
        className="max-h-[calc(100vh-32px)] gap-0 overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">快捷键</DialogTitle>
        <div className="flex max-h-[calc(100vh-32px)] flex-col">
          <div className="border-b border-[#eeeeee] px-6 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                <Keyboard className="size-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-medium leading-7 text-[#0d0d0d]">
                  快捷键
                </p>
                <p className="mt-1 text-sm leading-5 text-[#666]">
                  用键盘快速打开搜索、新建创作和控制编辑器。
                </p>
              </div>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {shortcutGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-2 text-sm font-medium leading-5 text-[#777]">
                    {group.title}
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-[#eeeeee]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex min-h-[58px] items-center justify-between gap-4 border-b border-[#eeeeee] px-4 py-3 last:border-b-0"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f7f7f7] text-[#666]">
                              <Icon className="size-4" strokeWidth={1.9} />
                            </span>
                            <span className="truncate text-sm font-medium text-[#0d0d0d]">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {item.keys.map((key) => (
                              <Keycap key={key} value={key} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="border-t border-[#eeeeee] px-6 py-4">
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
