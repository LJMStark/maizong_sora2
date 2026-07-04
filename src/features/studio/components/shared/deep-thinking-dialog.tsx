"use client";

import React from "react";
import { Brain, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type DeepThinkingResult } from "../../utils/deep-thinking";

interface DeepThinkingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: DeepThinkingResult | null;
  onConfirm: () => void;
}

const BUTTON_BASE =
  "h-10 flex-1 rounded-full px-5 text-sm font-medium transition-colors";
const BUTTON_CANCEL = `${BUTTON_BASE} border border-[#d9d9d9] text-[#555] hover:bg-[#f7f7f7] hover:text-[#0d0d0d]`;
const BUTTON_CONFIRM = `${BUTTON_BASE} bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]`;

export function DeepThinkingDialog({
  open,
  onOpenChange,
  result,
  onConfirm,
}: DeepThinkingDialogProps) {
  React.useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent("studio:modal-opened"));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="deep-thinking"
        className="max-h-[min(760px,92vh)] gap-0 overflow-y-auto rounded-2xl border border-[#e5e5e5] bg-white p-0 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-2xl"
      >
        <DialogHeader className="px-5 pb-0 pt-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-medium text-[#0d0d0d]">
            <Brain className="size-5" strokeWidth={1.9} />
            深度思考
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#777]">
            先拆解创作目标，再生成一版可以直接使用的提示词。
          </DialogDescription>
        </DialogHeader>

        {result && (
          <div className="space-y-4 p-5">
            <section className="space-y-2">
              <p className="text-sm font-medium text-[#777]">原始输入</p>
              <div className="max-h-28 overflow-y-auto rounded-2xl bg-[#f7f7f7] p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#0d0d0d]">
                  {result.originalPrompt}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium text-[#0d0d0d]">思考过程</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {result.summary.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#e7e7e7] bg-white p-3"
                  >
                    <p className="text-xs font-medium text-[#777]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-[#0d0d0d]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium text-[#0d0d0d]">
                建议提示词
              </p>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#d9d9d9] bg-white p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#0d0d0d]">
                  {result.plannedPrompt}
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-[#f7f7f7] px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {result.checklist.map((item) => (
                  <span
                    key={item}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-xs text-[#555]"
                  >
                    <Check className="size-3.5" strokeWidth={2} />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}

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
            onClick={onConfirm}
            disabled={!result}
            className={BUTTON_CONFIRM}
          >
            使用此提示词
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
