"use client";

import {
  BookOpen,
  CircleHelp,
  FileQuestion,
  Grid2X2,
  ImageIcon,
  Keyboard,
  Video,
  WalletCards,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShortcuts: () => void;
}

const guideItems = [
  {
    title: "图像创作",
    description: "选择尺寸、画质和提示词后生成图片。",
    icon: ImageIcon,
  },
  {
    title: "视频创作",
    description: "按速度或质量模式创建短视频任务。",
    icon: Video,
  },
  {
    title: "作品库",
    description: "查看、筛选和下载已经完成的作品。",
    icon: Grid2X2,
  },
  {
    title: "积分中心",
    description: "查看余额、兑换码和套餐记录。",
    icon: WalletCards,
  },
];

const faqItems = [
  {
    question: "生成失败后积分会怎样？",
    answer: "任务失败会自动返还本次扣除的积分。若状态长时间未更新，可以稍后刷新作品库。",
  },
  {
    question: "为什么视频一直显示处理中？",
    answer: "视频任务由供应商回调结果，通常需要等待几分钟，复杂内容会更久。",
  },
  {
    question: "怎么快速找回历史创作？",
    answer: "使用搜索入口或按 Command/Ctrl + K，可按标题搜索最近创作记录。",
  },
];

export function HelpDialog({
  open,
  onOpenChange,
  onOpenShortcuts,
}: HelpDialogProps) {
  const handleOpenShortcuts = () => {
    onOpenChange(false);
    window.setTimeout(onOpenShortcuts, 240);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="help"
        className="max-h-[calc(100vh-32px)] gap-0 overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-w-[620px]"
      >
        <DialogTitle className="sr-only">帮助</DialogTitle>
        <div className="flex max-h-[calc(100vh-32px)] flex-col">
          <div className="border-b border-[#eeeeee] px-6 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-white">
                <CircleHelp className="size-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-medium leading-7 text-[#0d0d0d]">
                  帮助
                </p>
                <p className="mt-1 text-sm leading-5 text-[#666]">
                  快速查看创作、作品、积分和快捷键说明。
                </p>
              </div>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="size-4 text-[#777]" strokeWidth={1.9} />
                  <h3 className="text-sm font-medium leading-5 text-[#0d0d0d]">
                    使用指南
                  </h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {guideItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="min-h-[92px] rounded-2xl border border-[#eeeeee] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#666]">
                            <Icon className="size-4" strokeWidth={1.9} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-[#777]">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <FileQuestion
                    className="size-4 text-[#777]"
                    strokeWidth={1.9}
                  />
                  <h3 className="text-sm font-medium leading-5 text-[#0d0d0d]">
                    常见问题
                  </h3>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#eeeeee]">
                  {faqItems.map((item) => (
                    <div
                      key={item.question}
                      className="border-b border-[#eeeeee] px-4 py-3 last:border-b-0"
                    >
                      <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
                        {item.question}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[#777]">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#eeeeee] px-6 py-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleOpenShortcuts}
              data-help-secondary-action="true"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#d9d9d9] px-4 text-sm font-medium text-[#0d0d0d] transition hover:bg-[#f7f7f7]"
            >
              <Keyboard className="size-4" strokeWidth={1.9} />
              查看快捷键
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              data-help-primary-action="true"
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
