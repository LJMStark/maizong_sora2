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

// 样式常量
const BUTTON_BASE = "flex-1 py-4 px-6 text-[12px] font-bold uppercase tracking-widest transition-colors";
const BUTTON_CANCEL = `${BUTTON_BASE} border border-[#e5e5e1] text-[#4b5563] hover:border-[#1a1a1a] hover:text-[#1a1a1a]`;
const BUTTON_CONFIRM = `${BUTTON_BASE} bg-[#8C7355] text-white hover:bg-[#7a6349]`;

export function PromptEnhanceDialog({
  open,
  onOpenChange,
  originalPrompt,
  enhancedPrompt,
  onConfirm,
}: PromptEnhanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border border-[#e5e5e1] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-serif text-2xl italic text-[#1a1a1a] font-normal">
            提示词润色预览
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* 原始提示词 */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.15em] text-[#4b5563]">
              原始提示词
            </label>
            <div className="border border-[#e5e5e1] bg-[#faf9f6] p-4">
              <p className="text-sm text-[#1a1a1a] leading-relaxed">
                {originalPrompt}
              </p>
            </div>
          </div>

          {/* 润色后提示词 */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.15em] text-[#8C7355]">
              润色后提示词
            </label>
            <div className="border border-[#8C7355] bg-[#faf9f6] p-4">
              <p className="text-sm text-[#1a1a1a] leading-relaxed font-medium">
                {enhancedPrompt}
              </p>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-[#faf9f6] border border-[#e5e5e1] p-4">
            <p className="text-xs text-[#4b5563] leading-relaxed">
              润色后的提示词已根据 Sora 2 最佳实践优化，包含更具体的视觉描述和场景细节。
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 sm:gap-3">
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
