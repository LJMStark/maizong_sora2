"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PromptEnhanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalPrompt: string;
  enhancedPrompt: string;
  onConfirm: () => void;
}

const BUTTON_BASE = "h-12 flex-1 rounded-full px-6 text-[16px] font-medium transition-colors";
const BUTTON_CANCEL = `${BUTTON_BASE} border border-[#d9d9d9] text-[#777] hover:bg-[#f7f7f7] hover:text-[#0d0d0d]`;
const BUTTON_CONFIRM = `${BUTTON_BASE} bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]`;

export function PromptEnhanceDialog({
  open,
  onOpenChange,
  originalPrompt,
  enhancedPrompt,
  onConfirm,
}: PromptEnhanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-[18px] border border-[#e5e5e5] bg-white p-0 sm:max-w-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-[26px] font-normal text-[#0d0d0d]">
            提示词润色预览
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#777]">
              原始提示词
            </label>
            <div className="rounded-[18px] border border-[#e5e5e5] bg-[#f7f7f7] p-4">
              <p className="text-sm leading-relaxed text-[#0d0d0d]">
                {originalPrompt}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0d0d0d]">
              润色后提示词
            </label>
            <div className="rounded-[18px] border border-[#b8b8b8] bg-white p-4">
              <p className="text-sm font-medium leading-relaxed text-[#0d0d0d]">
                {enhancedPrompt}
              </p>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#e5e5e5] bg-[#f7f7f7] p-4">
            <p className="text-xs leading-relaxed text-[#777]">
              润色后的提示词已根据 Sora 2 最佳实践优化，包含更具体的视觉描述和场景细节。
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3 p-6 pt-0 sm:gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className={BUTTON_CANCEL}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={BUTTON_CONFIRM}
          >
            使用润色版本
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
