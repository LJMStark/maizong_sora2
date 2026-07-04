"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const BUTTON_BASE = "h-10 flex-1 rounded-full px-5 text-sm font-medium transition-colors";
const BUTTON_CANCEL = `${BUTTON_BASE} border border-[#d9d9d9] text-[#555] hover:bg-[#f7f7f7] hover:text-[#0d0d0d]`;
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
      <DialogContent
        data-studio-dialog-surface="prompt-enhance"
        className="max-h-[min(720px,92vh)] gap-0 overflow-y-auto rounded-2xl border border-[#e5e5e5] bg-white p-0 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-2xl"
      >
        <DialogHeader className="px-5 pb-0 pt-5">
          <DialogTitle className="text-xl font-medium text-[#0d0d0d]">
            提示词润色预览
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#777]">
            对比原始内容和润色结果，确认后会替换当前输入框。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#777]">
              原始提示词
            </label>
            <div className="max-h-32 overflow-y-auto rounded-2xl bg-[#f7f7f7] p-4">
              <p className="text-sm leading-6 text-[#0d0d0d]">
                {originalPrompt}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0d0d0d]">
              润色后提示词
            </label>
            <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#d9d9d9] bg-white p-4">
              <p className="text-sm leading-6 text-[#0d0d0d]">
                {enhancedPrompt}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#f7f7f7] px-4 py-3">
            <p className="text-xs leading-5 text-[#777]">
              使用后会替换当前输入框内容，仍可继续手动编辑。
            </p>
          </div>
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
