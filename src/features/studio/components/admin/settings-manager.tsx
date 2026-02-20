"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type VideoProvider = "kie" | "duomi" | "veo";

const PROVIDER_LABELS: Record<VideoProvider, string> = {
  kie: "KIE AI",
  duomi: "Duomi",
  veo: "VEO",
};

interface GlobalSettings {
  dailyFastVideoLimit: number;
  dailyQualityVideoLimit: number;
  videoFastProvider: VideoProvider;
  videoQualityProvider: VideoProvider;
  creditCostVideoFast: number;
  creditCostVideoQuality: number;
  creditCostImage: number;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [form, setForm] = useState({
    dailyFastVideoLimit: -1,
    dailyQualityVideoLimit: 2,
    videoFastProvider: "kie" as VideoProvider,
    videoQualityProvider: "kie" as VideoProvider,
    creditCostVideoFast: 30,
    creditCostVideoQuality: 100,
    creditCostImage: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error(`请求失败（状态码 ${res.status}）`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "加载设置失败");
      }
      setSettings(json.data);
      setForm({
        dailyFastVideoLimit: json.data.dailyFastVideoLimit ?? -1,
        dailyQualityVideoLimit: json.data.dailyQualityVideoLimit ?? 2,
        videoFastProvider: json.data.videoFastProvider ?? "kie",
        videoQualityProvider: json.data.videoQualityProvider ?? "kie",
        creditCostVideoFast: json.data.creditCostVideoFast ?? 30,
        creditCostVideoQuality: json.data.creditCostVideoQuality ?? 100,
        creditCostImage: json.data.creditCostImage ?? 10,
      });
    } catch (error) {
      console.error("加载系统设置失败:", error);
      toast.error(`加载设置失败：${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "保存设置失败");
      }
      setSettings(json.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("保存系统设置失败:", error);
      toast.error(`保存设置失败：${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#4b5563] animate-pulse">加载中...</div>;
  }

  if (!settings) {
    return <div className="text-sm text-red-500">加载设置失败</div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-lg border border-[#e5e5e1] p-6 space-y-4">
        <h2 className="font-medium text-[#1a1a1a]">视频供应商配置</h2>
        <p className="text-xs text-[#9ca3af]">为每种视频模式选择使用的供应商</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
              快速视频 (Fast) 供应商
            </label>
            <select
              value={form.videoFastProvider}
              onChange={(e) => setForm({ ...form, videoFastProvider: e.target.value as VideoProvider })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="kie">KIE AI</option>
              <option value="duomi">Duomi</option>
              <option value="veo">VEO</option>
            </select>
            <p className="text-xs text-[#9ca3af] mt-1">
              当前: {PROVIDER_LABELS[settings.videoFastProvider]}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
              高质量视频 (Quality) 供应商
            </label>
            <select
              value={form.videoQualityProvider}
              onChange={(e) => setForm({ ...form, videoQualityProvider: e.target.value as VideoProvider })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="kie">KIE AI</option>
              <option value="duomi">Duomi</option>
              <option value="veo">VEO</option>
            </select>
            <p className="text-xs text-[#9ca3af] mt-1">
              当前: {PROVIDER_LABELS[settings.videoQualityProvider]}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#e5e5e1] p-6 space-y-4">
        <h2 className="font-medium text-[#1a1a1a]">积分消耗配置</h2>
        <p className="text-xs text-[#9ca3af]">设置各类生成任务的积分消耗</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
              快速视频积分消耗
            </label>
            <Input
              type="number"
              value={form.creditCostVideoFast}
              onChange={(e) => setForm({ ...form, creditCostVideoFast: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-[#9ca3af] mt-1">
              当前值: {settings?.creditCostVideoFast ?? 30}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
              高质量视频积分消耗
            </label>
            <Input
              type="number"
              value={form.creditCostVideoQuality}
              onChange={(e) => setForm({ ...form, creditCostVideoQuality: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-[#9ca3af] mt-1">
              当前值: {settings?.creditCostVideoQuality ?? 100}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
              图片生成积分消耗
            </label>
            <Input
              type="number"
              value={form.creditCostImage}
              onChange={(e) => setForm({ ...form, creditCostImage: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-[#9ca3af] mt-1">
              当前值: {settings?.creditCostImage ?? 10}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#e5e5e1] p-6 space-y-4">
        <h2 className="font-medium text-[#1a1a1a]">每日视频生成限额</h2>
        <p className="text-xs text-[#9ca3af]">-1 = 无限制, 0 = 禁用, 正数 = 每日限额</p>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
            快速视频 (Fast) 每日限额
          </label>
          <Input
            type="number"
            value={form.dailyFastVideoLimit}
            onChange={(e) => setForm({ ...form, dailyFastVideoLimit: parseInt(e.target.value) || 0 })}
            min={-1}
          />
          <p className="text-xs text-[#9ca3af] mt-1">
            当前值: {settings?.dailyFastVideoLimit === -1 ? "无限制" : settings?.dailyFastVideoLimit}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">
            质量视频 (Quality) 每日限额
          </label>
          <Input
            type="number"
            value={form.dailyQualityVideoLimit}
            onChange={(e) => setForm({ ...form, dailyQualityVideoLimit: parseInt(e.target.value) || 0 })}
            min={-1}
          />
          <p className="text-xs text-[#9ca3af] mt-1">
            当前值: {settings?.dailyQualityVideoLimit === -1 ? "无限制" : settings?.dailyQualityVideoLimit}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "保存中..." : "保存设置"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">已保存</span>
        )}
      </div>
    </div>
  );
}
