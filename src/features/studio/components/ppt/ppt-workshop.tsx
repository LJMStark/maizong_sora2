"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/client";
import { useStudio } from "@/features/studio/context/studio-context";
import { openLoginDialog } from "@/features/studio/utils/studio-events";
import { DEFAULT_CREDIT_COSTS } from "@/features/studio/data/credit-defaults";
import { PPT_SKILLS } from "@/features/studio/data/ppt-skills";
import { StepConfig, type PptConfigValue } from "./step-config";
import { StepOutline } from "./step-outline";
import { StepRun } from "./step-run";
import { StepPreview } from "./step-preview";
import { usePptPolling } from "./use-ppt-polling";
import type { PptOutlineSlideDraft, PptTaskListItem } from "./types";

type WizardStep = "config" | "outline" | "run";

const ACTIVE_STATUSES = [
  "pending",
  "generating_sample",
  "awaiting_confirm",
  "generating",
];

function defaultConfig(): PptConfigValue {
  const firstSkill = PPT_SKILLS[0];
  return {
    topic: "",
    docText: "",
    skillKey: firstSkill?.key ?? "",
    styleKey: firstSkill?.styles[0]?.key ?? "",
    anchorColor: null,
    pageCount: 8,
    resolution: "2k",
    sampleFirst: true,
    speechNotesEnabled: false,
    template: null,
  };
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "请求失败，请稍后重试"
    );
  }
  return data;
}

export default function PptWorkshop() {
  const { data: session } = useSession();
  const hasUser = Boolean(session?.user);
  const { refreshCredits } = useStudio();

  const [step, setStep] = useState<WizardStep>("config");
  const [config, setConfig] = useState<PptConfigValue>(defaultConfig);
  const [deckTitle, setDeckTitle] = useState("");
  const [outlineSlides, setOutlineSlides] = useState<PptOutlineSlideDraft[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resumeKey, setResumeKey] = useState(0);

  const [isOutlineLoading, setIsOutlineLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [resumeTask, setResumeTask] = useState<PptTaskListItem | null>(null);

  const { snapshot, error: pollError, refetch } = usePptPolling(taskId, resumeKey);

  // 重开页面时发现未完成任务 → 提示继续
  useEffect(() => {
    if (!hasUser || taskId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/ppt/tasks");
        if (!response.ok) return;
        const data = await response.json();
        const active = (data.tasks as PptTaskListItem[]).find((t) =>
          ACTIVE_STATUSES.includes(t.status)
        );
        if (!cancelled && active) {
          setResumeTask(active);
        }
      } catch {
        // 静默：仅影响恢复提示
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasUser, taskId]);

  // 快照回到终态时清理单页重生成指示
  useEffect(() => {
    if (
      snapshot &&
      !ACTIVE_STATUSES.includes(snapshot.status) &&
      regeneratingIndex !== null
    ) {
      setRegeneratingIndex(null);
      void refreshCredits();
    }
  }, [snapshot, regeneratingIndex, refreshCredits]);

  const requireLogin = useCallback(() => {
    if (hasUser) return true;
    openLoginDialog();
    return false;
  }, [hasUser]);

  const fetchOutline = useCallback(async () => {
    const data = await postJson("/api/ppt/outline", {
      topic: config.topic.trim() || undefined,
      docText: config.docText.trim() || undefined,
      pageCount: config.pageCount,
      skillKey: config.skillKey,
      styleKey: config.styleKey,
    });
    setDeckTitle(String(data.title ?? config.topic.trim() ?? "未命名 PPT"));
    setOutlineSlides(data.slides as PptOutlineSlideDraft[]);
  }, [config]);

  const handleGenerateOutline = async () => {
    if (!requireLogin()) return;
    setIsOutlineLoading(true);
    try {
      await fetchOutline();
      setStep("outline");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "大纲生成失败");
    } finally {
      setIsOutlineLoading(false);
    }
  };

  const handleRegenerateOutline = async () => {
    setIsOutlineLoading(true);
    try {
      await fetchOutline();
      toast.success("大纲已重新生成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "大纲生成失败");
    } finally {
      setIsOutlineLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!requireLogin()) return;
    setIsCreating(true);
    try {
      const normalizedOutline = outlineSlides.map((slide, i) => ({
        ...slide,
        index: i + 1,
        bullets: slide.bullets.filter((b) => b.trim().length > 0),
      }));
      const data = await postJson("/api/ppt/generate", {
        title: deckTitle.trim(),
        skillKey: config.skillKey,
        styleKey: config.styleKey,
        anchorColor: config.anchorColor ?? undefined,
        resolution: config.resolution,
        pageCount: normalizedOutline.length,
        outline: normalizedOutline,
        sampleFirst: config.sampleFirst,
        speechNotesEnabled: config.speechNotesEnabled,
        templateProfile: config.template?.profile,
        templateRefImageUrls:
          config.template && config.template.refImageUrls.length > 0
            ? config.template.refImageUrls
            : undefined,
      });
      setTaskId(String(data.taskId));
      setResumeKey(0);
      setStep("run");
      setResumeTask(null);
      void refreshCredits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务创建失败");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmSample = async () => {
    if (!taskId) return;
    setIsActing(true);
    try {
      await postJson("/api/ppt/sample", { taskId, action: "confirm" });
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setIsActing(false);
    }
  };

  const handleRegenerateSample = async (params: {
    styleKey?: string;
    anchorColor?: string;
    promptOverride?: string;
  }) => {
    if (!taskId) return;
    setIsActing(true);
    try {
      await postJson("/api/ppt/sample", {
        taskId,
        action: "regenerate",
        ...params,
      });
      void refreshCredits();
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "样张重生成失败");
    } finally {
      setIsActing(false);
    }
  };

  const handleCancel = async () => {
    if (!taskId) return;
    setIsActing(true);
    try {
      const data = await postJson("/api/ppt/cancel", { taskId });
      const refunded = Number(data.refundedAmount ?? 0);
      toast.success(
        refunded > 0 ? `已中止，退还 ${refunded} 积分` : "已中止任务"
      );
      void refreshCredits();
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "取消失败");
    } finally {
      setIsActing(false);
    }
  };

  const handleRegenerateSlide = async (slideIndex: number) => {
    if (!taskId) return;
    setRegeneratingIndex(slideIndex);
    try {
      await postJson("/api/ppt/slide/regenerate", { taskId, slideIndex });
      void refreshCredits();
      setResumeKey((prev) => prev + 1); // 任务重新激活，重启轮询
    } catch (error) {
      setRegeneratingIndex(null);
      toast.error(error instanceof Error ? error.message : "重生成失败");
    }
  };

  const handleGenerateSpeech = async () => {
    if (!taskId) return;
    setIsGeneratingSpeech(true);
    try {
      await postJson("/api/ppt/speech", { taskId });
      await refetch();
      toast.success("演讲备注已生成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "备注生成失败");
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  const handleStartNew = () => {
    setTaskId(null);
    setResumeKey(0);
    setStep("config");
    setOutlineSlides([]);
    setDeckTitle("");
  };

  const resumeExisting = (task: PptTaskListItem) => {
    setTaskId(task.taskId);
    setResumeKey(0);
    setStep("run");
    setResumeTask(null);
  };

  const isTerminal = snapshot && !ACTIVE_STATUSES.includes(snapshot.status);
  const showPreview =
    isTerminal &&
    (snapshot.status === "succeeded" || snapshot.status === "partial");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 md:px-6">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#0d0d0d] text-white">
          <Presentation className="size-5" />
        </span>
        <div>
          <h1 className="text-[19px] font-semibold text-[#0d0d0d]">PPT 工作室</h1>
          <p className="text-[13px] text-[#999]">
            集成 GitHub 热门 PPT Skills · GPT-Image-2 逐页整图生成 · 多格式导出
          </p>
        </div>
      </header>

      {!hasUser && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3">
          <span className="text-[14px] text-[#555]">登录后即可生成 PPT</span>
          <button
            type="button"
            onClick={() => openLoginDialog()}
            className="h-9 rounded-full bg-[#0d0d0d] px-4 text-[13px] font-medium text-white transition hover:bg-black"
          >
            登录 / 注册
          </button>
        </div>
      )}

      {resumeTask && step !== "run" && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-[14px] text-amber-800">
            有一套未完成的 PPT「{resumeTask.title}」（{resumeTask.pageCount} 页）
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => resumeExisting(resumeTask)}
              className="h-9 rounded-full bg-amber-600 px-4 text-[13px] font-medium text-white transition hover:bg-amber-700"
            >
              继续生成
            </button>
            <button
              type="button"
              onClick={() => setResumeTask(null)}
              className="h-9 rounded-full border border-amber-200 px-3 text-[13px] text-amber-700 transition hover:bg-amber-100"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {step === "config" && (
        <StepConfig
          value={config}
          onChange={setConfig}
          creditCostPerPage={DEFAULT_CREDIT_COSTS.pptPage}
          isSubmitting={isOutlineLoading}
          onSubmit={() => void handleGenerateOutline()}
        />
      )}

      {step === "outline" && (
        <StepOutline
          deckTitle={deckTitle}
          onDeckTitleChange={setDeckTitle}
          slides={outlineSlides}
          onSlidesChange={setOutlineSlides}
          creditCostPerPage={DEFAULT_CREDIT_COSTS.pptPage}
          isRegenerating={isOutlineLoading}
          isSubmitting={isCreating}
          onBack={() => setStep("config")}
          onRegenerate={() => void handleRegenerateOutline()}
          onSubmit={() => void handleCreateTask()}
        />
      )}

      {step === "run" && (
        <>
          {!snapshot ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[#999]">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-[14px]">{pollError ?? "加载任务中…"}</span>
            </div>
          ) : showPreview ? (
            <StepPreview
              snapshot={snapshot}
              regeneratingIndex={regeneratingIndex}
              isGeneratingSpeech={isGeneratingSpeech}
              onRegenerateSlide={(i) => void handleRegenerateSlide(i)}
              onGenerateSpeech={() => void handleGenerateSpeech()}
              onStartNew={handleStartNew}
            />
          ) : isTerminal ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-black/10 bg-white py-16">
              <span className="text-[15px] font-medium text-[#0d0d0d]">
                {snapshot.status === "cancelled" ? "任务已取消" : "任务失败"}
              </span>
              {snapshot.errorMessage && (
                <span className="max-w-md px-6 text-center text-[13px] text-[#999]">
                  {snapshot.errorMessage}
                </span>
              )}
              {snapshot.refundedCredits > 0 && (
                <span className="text-[13px] text-[#999]">
                  已退还 {snapshot.refundedCredits} 积分
                </span>
              )}
              <button
                type="button"
                onClick={handleStartNew}
                className="mt-2 h-10 rounded-full bg-[#0d0d0d] px-5 text-[14px] font-medium text-white transition hover:bg-black"
              >
                重新开始
              </button>
            </div>
          ) : (
            <StepRun
              snapshot={snapshot}
              isActing={isActing}
              onConfirmSample={() => void handleConfirmSample()}
              onRegenerateSample={(p) => void handleRegenerateSample(p)}
              onCancel={() => void handleCancel()}
            />
          )}
        </>
      )}
    </div>
  );
}
