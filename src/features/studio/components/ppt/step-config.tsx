"use client";

import React, { useRef, useState } from "react";
import { FileUp, Loader2, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StylePicker } from "./style-picker";
import type { PptTemplateInfo } from "./types";
import {
  fileToBase64,
  extractBase64Data,
} from "@/features/studio/utils/file-helpers";

const MIN_PAGES = 3;
const MAX_PAGES = 20;

export interface PptConfigValue {
  topic: string;
  docText: string;
  skillKey: string;
  styleKey: string;
  anchorColor: string | null;
  pageCount: number;
  resolution: "2k" | "4k";
  sampleFirst: boolean;
  speechNotesEnabled: boolean;
  template: PptTemplateInfo | null;
}

interface StepConfigProps {
  value: PptConfigValue;
  onChange: (value: PptConfigValue) => void;
  creditCostPerPage: number;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:border-black/25"
    >
      <span>
        <span className="block text-[14px] font-medium text-[#0d0d0d]">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-4 text-[#999]">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition",
          checked ? "bg-[#0d0d0d]" : "bg-black/15"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white transition-all",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function StepConfig({
  value,
  onChange,
  creditCostPerPage,
  isSubmitting,
  onSubmit,
}: StepConfigProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDocText, setShowDocText] = useState(false);

  const update = (patch: Partial<PptConfigValue>) =>
    onChange({ ...value, ...patch });

  const estimatedCost = value.pageCount * creditCostPerPage;
  const canSubmit =
    Boolean(value.topic.trim() || value.docText.trim()) &&
    Boolean(value.skillKey && value.styleKey) &&
    !isSubmitting &&
    !isAnalyzing;

  const handleTemplateFile = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const dataUrl = await fileToBase64(file);
      const isPptx =
        file.name.toLowerCase().endsWith(".pptx") ||
        file.type.includes("presentation");

      let body: Record<string, unknown>;
      if (isPptx) {
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error("文件读取失败");
        body = { pptxBase64: base64 };
      } else {
        const extracted = extractBase64Data(dataUrl);
        if (!extracted) throw new Error("图片读取失败");
        body = {
          images: [{ base64: extracted.base64, mimeType: extracted.mimeType }],
        };
      }

      const response = await fetch("/api/ppt/template/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "模板分析失败");
      }

      update({
        template: {
          profile: data.templateProfile,
          refImageUrls: data.refImageUrls ?? [],
        },
      });
      toast.success("模板分析完成，将按模板版式与配色生成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模板分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[15px] font-medium text-[#0d0d0d]">主题</h2>
        <textarea
          value={value.topic}
          onChange={(e) => update({ topic: e.target.value })}
          placeholder="想讲什么？例如：2026 年新能源汽车出海策略汇报"
          rows={2}
          maxLength={200}
          className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#bbb] focus:border-black/30"
        />
        <button
          type="button"
          onClick={() => setShowDocText((prev) => !prev)}
          className="mt-1 text-[13px] text-[#777] underline decoration-black/20 underline-offset-2 hover:text-[#0d0d0d]"
        >
          {showDocText ? "收起参考文档" : "粘贴参考文档（可选）"}
        </button>
        {showDocText && (
          <textarea
            value={value.docText}
            onChange={(e) => update({ docText: e.target.value })}
            placeholder="粘贴文章、报告或笔记，AI 会据此提炼大纲（最多 20000 字）"
            rows={6}
            maxLength={20000}
            className="mt-2 w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#bbb] focus:border-black/30"
          />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-medium text-[#0d0d0d]">
            选择 Skill 与风格
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleTemplateFile(file);
                e.target.value = "";
              }}
            />
            {value.template ? (
              <span className="flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[13px] text-[#0d0d0d]">
                <span className="flex items-center gap-1">
                  {value.template.profile.palette.slice(0, 4).map((hex) => (
                    <span
                      key={hex}
                      className="size-3.5 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                已用模板克隆
                <button
                  type="button"
                  aria-label="移除模板"
                  onClick={() => update({ template: null })}
                  className="text-[#999] hover:text-[#0d0d0d]"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[13px] text-[#555] transition hover:bg-black/[0.04] disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileUp className="size-3.5" />
                )}
                {isAnalyzing ? "分析模板中…" : "上传模板克隆"}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-[12px] text-[#999]">
          可上传 .pptx 或模板截图，AI 提取版式与配色后仿版式生成
        </p>
        <div className="mt-3">
          <StylePicker
            skillKey={value.skillKey}
            styleKey={value.styleKey}
            anchorColor={value.anchorColor}
            onSelect={(skillKey, styleKey) =>
              update({ skillKey, styleKey, anchorColor: null })
            }
            onAnchorColorChange={(anchorColor) => update({ anchorColor })}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <span className="block text-[14px] font-medium text-[#0d0d0d]">页数</span>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              aria-label="减少页数"
              disabled={value.pageCount <= MIN_PAGES}
              onClick={() => update({ pageCount: value.pageCount - 1 })}
              className="flex size-8 items-center justify-center rounded-full border border-black/10 text-[#555] transition hover:bg-black/[0.04] disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-10 text-center text-[17px] font-semibold text-[#0d0d0d]">
              {value.pageCount}
            </span>
            <button
              type="button"
              aria-label="增加页数"
              disabled={value.pageCount >= MAX_PAGES}
              onClick={() => update({ pageCount: value.pageCount + 1 })}
              className="flex size-8 items-center justify-center rounded-full border border-black/10 text-[#555] transition hover:bg-black/[0.04] disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
            <span className="text-[12px] text-[#999]">
              {MIN_PAGES}-{MAX_PAGES} 页
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <span className="block text-[14px] font-medium text-[#0d0d0d]">分辨率</span>
          <div className="mt-2 flex items-center gap-2">
            {(["2k", "4k"] as const).map((resolution) => {
              const active = value.resolution === resolution;
              return (
                <button
                  key={resolution}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ resolution })}
                  className={cn(
                    "h-8 rounded-full px-4 text-sm transition",
                    active
                      ? "bg-[#0d0d0d] font-medium text-white"
                      : "border border-black/10 bg-white text-[#555] hover:bg-black/[0.04]"
                  )}
                >
                  {resolution.toUpperCase()}
                </button>
              );
            })}
            <span className="text-[12px] text-[#999]">
              {value.resolution === "2k" ? "2048×1152，约 30 秒/页" : "3840×2160，约 60 秒/页"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label="样张先行"
          hint="先生成第 1 页确认风格，满意后再继续，防止整套跑偏"
          checked={value.sampleFirst}
          onChange={(sampleFirst) => update({ sampleFirst })}
        />
        <ToggleRow
          label="演讲备注"
          hint="生成完成后为每页撰写演讲备注，随 PPTX 导出"
          checked={value.speechNotesEnabled}
          onChange={(speechNotesEnabled) => update({ speechNotesEnabled })}
        />
      </section>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6f6f6] px-4 py-3">
        <span className="text-[13px] text-[#777]">
          预估消耗{" "}
          <span className="font-semibold text-[#0d0d0d]">{estimatedCost}</span>{" "}
          积分（{value.pageCount} 页 × {creditCostPerPage}），失败页自动退回
        </span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0d0d0d] px-5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? "生成大纲中…" : "生成大纲"}
        </button>
      </div>
    </div>
  );
}
