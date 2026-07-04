"use client";

import React from "react";
import { ExternalLink, Link as LinkIcon, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildSearchQuery,
  type SearchReferenceKind,
} from "../../utils/search-reference";

interface SearchReferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: SearchReferenceKind;
  prompt: string;
  modeLabel: string;
  onConfirm: (draft: {
    query: string;
    notes: string;
    sourceUrl: string;
  }) => void;
}

const BUTTON_BASE =
  "h-10 flex-1 rounded-full px-5 text-sm font-medium transition-colors";
const BUTTON_CANCEL = `${BUTTON_BASE} border border-[#d9d9d9] text-[#555] hover:bg-[#f7f7f7] hover:text-[#0d0d0d]`;
const BUTTON_CONFIRM = `${BUTTON_BASE} bg-[#0d0d0d] text-white hover:bg-[#2a2a2a] disabled:bg-[#d7d7d7]`;

export function SearchReferenceDialog({
  open,
  onOpenChange,
  kind,
  prompt,
  modeLabel,
  onConfirm,
}: SearchReferenceDialogProps) {
  const [query, setQuery] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const canConfirm = notes.trim().length > 0 || sourceUrl.trim().length > 0;

  React.useEffect(() => {
    if (!open) return;

    window.dispatchEvent(new CustomEvent("studio:modal-opened"));
    setQuery(buildSearchQuery({ kind, prompt, modeLabel }));
    setNotes("");
    setSourceUrl("");
  }, [kind, modeLabel, open, prompt]);

  const openSearchPage = () => {
    const target = query.trim();
    if (!target) return;

    window.open(
      `https://www.bing.com/search?q=${encodeURIComponent(target)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="search-reference"
        className="max-h-[min(720px,92vh)] gap-0 overflow-y-auto rounded-2xl border border-[#e5e5e5] bg-white p-0 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-2xl"
      >
        <DialogHeader className="px-5 pb-0 pt-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-medium text-[#0d0d0d]">
            <Search className="size-5" strokeWidth={1.9} />
            联网搜索
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#777]">
            整理搜索参考，并合并进当前提示词。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#0d0d0d]">搜索词</span>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-full border border-[#d9d9d9] bg-white px-4 text-sm text-[#0d0d0d] outline-none transition focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
              />
              <button
                type="button"
                onClick={openSearchPage}
                disabled={!query.trim()}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#d9d9d9] bg-white px-4 text-sm font-medium text-[#0d0d0d] hover:bg-[#f7f7f7] disabled:text-[#aaa]"
              >
                <ExternalLink className="size-4" strokeWidth={1.9} />
                打开
              </button>
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#0d0d0d]">参考摘录</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              maxLength={1600}
              placeholder="粘贴事实、风格要点、产品信息或视觉参考"
              className="min-h-[132px] w-full resize-none rounded-2xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#0d0d0d]">来源链接</span>
            <div className="flex h-11 items-center gap-2 rounded-full border border-[#d9d9d9] bg-white px-4 transition focus-within:border-[#0d0d0d] focus-within:ring-4 focus-within:ring-black/10">
              <LinkIcon className="size-4 shrink-0 text-[#777]" strokeWidth={1.9} />
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://"
                inputMode="url"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#0d0d0d] outline-none placeholder:text-[#9a9a9a]"
              />
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2 px-5 pb-5 pt-0 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={BUTTON_CANCEL}
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm({ query, notes, sourceUrl })}
            className={BUTTON_CONFIRM}
          >
            加入提示词
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
