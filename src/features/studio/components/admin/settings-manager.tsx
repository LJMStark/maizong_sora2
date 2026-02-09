"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GlobalSettings {
  dailyFastVideoLimit: number;
  dailyQualityVideoLimit: number;
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [form, setForm] = useState({ dailyFastVideoLimit: -1, dailyQualityVideoLimit: 2 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        setForm({
          dailyFastVideoLimit: json.data.dailyFastVideoLimit ?? -1,
          dailyQualityVideoLimit: json.data.dailyQualityVideoLimit ?? 2,
        });
      }
    } catch {
      // ignore
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
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
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
            当前值: {settings.dailyFastVideoLimit === -1 ? "无限制" : settings.dailyFastVideoLimit}
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
            当前值: {settings.dailyQualityVideoLimit === -1 ? "无限制" : settings.dailyQualityVideoLimit}
          </p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存设置"}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">已保存</span>
          )}
        </div>
      </div>
    </div>
  );
}
