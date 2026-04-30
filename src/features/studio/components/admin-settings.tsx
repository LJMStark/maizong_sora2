"use client";

import React, { useState, useEffect, useCallback } from "react";

interface AdminSettingsProps {
  isAdmin: boolean;
}

interface GlobalLimits {
  dailyFastVideoLimit: number;
  dailyQualityVideoLimit: number;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ isAdmin }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [limits, setLimits] = useState<GlobalLimits>({
    dailyFastVideoLimit: -1,
    dailyQualityVideoLimit: 2,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLimits(data.data);
        }
      }
    } catch (error) {
      console.error("加载管理员设置失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && isExpanded) {
      fetchSettings();
    }
  }, [isAdmin, isExpanded, fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(limits),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: "success", text: "设置已保存" });
        setLimits(data.data);
      } else {
        const detail =
          typeof data.error === "string"
            ? data.error
            : `请求失败（状态码 ${res.status}）`;
        setMessage({ type: "error", text: `保存失败：${detail}` });
      }
    } catch (error) {
      console.error("保存管理员设置失败:", error);
      const detail = error instanceof Error ? error.message : String(error);
      setMessage({ type: "error", text: `网络错误：${detail}` });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-6 transition-colors hover:bg-[#f7f7f7]"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#0d0d0d]">
            settings
          </span>
          <span className="text-[16px] font-medium text-[#0d0d0d]">
            系统设置
          </span>
          <span className="rounded-full bg-[#f0f0f0] px-3 py-1 text-xs font-medium text-[#777]">
            管理员
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-[#777] transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-[#e5e5e5] p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-[#777]">
                progress_activity
              </span>
              <span className="ml-2 text-sm text-[#777]">加载中...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <h4 className="mb-4 text-sm font-medium text-[#0d0d0d]">
                  每日视频生成限制（全局默认）
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#0d0d0d]">
                      普通视频 (Fast)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="-1"
                        value={limits.dailyFastVideoLimit}
                        onChange={(e) =>
                          setLimits({
                            ...limits,
                            dailyFastVideoLimit: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-11 w-24 rounded-full border border-[#d9d9d9] bg-white px-4 text-sm outline-none transition-colors focus:border-[#4d6fb6] focus:ring-4 focus:ring-[#4d6fb6]/20"
                      />
                      <span className="text-sm text-[#777]">条/天</span>
                    </div>
                    <p className="text-xs text-[#777]">-1 = 不限制</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#0d0d0d]">
                      高质量视频 (Quality)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="-1"
                        value={limits.dailyQualityVideoLimit}
                        onChange={(e) =>
                          setLimits({
                            ...limits,
                            dailyQualityVideoLimit:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-11 w-24 rounded-full border border-[#d9d9d9] bg-white px-4 text-sm outline-none transition-colors focus:border-[#4d6fb6] focus:ring-4 focus:ring-[#4d6fb6]/20"
                      />
                      <span className="text-sm text-[#777]">条/天</span>
                    </div>
                    <p className="text-xs text-[#777]">-1 = 不限制</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-[#e5e5e5] pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-11 rounded-full bg-[#0d0d0d] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:bg-[#9ca3af]"
                >
                  {isSaving ? "保存中..." : "保存设置"}
                </button>
                {message && (
                  <span
                    className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}
                  >
                    {message.text}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
