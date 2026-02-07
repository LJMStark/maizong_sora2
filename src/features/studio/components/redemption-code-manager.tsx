"use client";

import React, { useState, useEffect, useCallback } from "react";

interface RedemptionCode {
  id: string;
  code: string;
  credits: number;
  status: "active" | "used" | "expired" | "disabled";
  expiresAt: string | null;
  usedBy: string | null;
  usedAt: string | null;
  createdBy: string;
  createdAt: string;
  note: string | null;
}

interface RedemptionCodeManagerProps {
  isAdmin: boolean;
}

interface Stats {
  active: { count: number; credits: number };
  used: { count: number; credits: number };
  expired: { count: number; credits: number };
  disabled: { count: number; credits: number };
  total: { count: number; credits: number };
}

interface TrendItem {
  date: string;
  count: number;
  credits: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: "可用",
  used: "已使用",
  expired: "已过期",
  disabled: "已禁用",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  used: "bg-gray-100 text-gray-700",
  expired: "bg-yellow-100 text-yellow-700",
  disabled: "bg-red-100 text-red-700",
};

const RedemptionCodeManager: React.FC<RedemptionCodeManagerProps> = ({
  isAdmin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Export
  const [isExporting, setIsExporting] = useState(false);

  // 生成表单
  const [credits, setCredits] = useState<number>(100);
  const [count, setCount] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generateError, setGenerateError] = useState<string>("");

  // 复制状态
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/redemption-codes?${params}`);
      const data = await res.json();
      if (data.success) {
        setCodes(data.data.codes);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch codes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, page, statusFilter]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingStats(true);
    try {
      const res = await fetch("/api/admin/redemption-codes/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setTrend(data.data.trend);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isExpanded && isAdmin) {
      fetchCodes();
      fetchStats();
    }
  }, [isExpanded, isAdmin, fetchCodes, fetchStats]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError("");
    setGeneratedCodes([]);

    try {
      const res = await fetch("/api/admin/redemption-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits,
          count,
          expiresAt: expiresAt || undefined,
          note: note || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedCodes(data.codes);
        fetchCodes();
        fetchStats();
      } else {
        setGenerateError(data.error || "生成失败");
      }
    } catch {
      setGenerateError("网络错误，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/admin/redemption-codes/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `redemption-codes-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Failed to export:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDisable = async (id: string) => {
    if (!confirm("确定要禁用此兑换码吗？")) return;

    try {
      const res = await fetch(`/api/admin/redemption-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disabled" }),
      });

      if (res.ok) {
        fetchCodes();
        fetchStats();
      }
    } catch (err) {
      console.error("Failed to disable code:", err);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-white border border-[#e5e5e1]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-[#faf9f6]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#8C7355]">
            confirmation_number
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#1a1a1a]">
            兑换码管理
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-[#4b5563] transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-[#e5e5e1] p-6 space-y-8">
          {/* 统计概览 */}
          {stats && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#4b5563] font-bold">
                统计概览
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[#faf9f6] p-4 border border-[#e5e5e1]">
                  <p className="text-xs text-[#4b5563]">总计</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{stats.total.count}</p>
                  <p className="text-xs text-[#4b5563]">{stats.total.credits} 积分</p>
                </div>
                <div className="bg-green-50 p-4 border border-green-200">
                  <p className="text-xs text-green-600">可用</p>
                  <p className="text-xl font-bold text-green-700">{stats.active.count}</p>
                  <p className="text-xs text-green-600">{stats.active.credits} 积分</p>
                </div>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <p className="text-xs text-gray-600">已使用</p>
                  <p className="text-xl font-bold text-gray-700">{stats.used.count}</p>
                  <p className="text-xs text-gray-600">{stats.used.credits} 积分</p>
                </div>
                <div className="bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-xs text-yellow-600">已过期</p>
                  <p className="text-xl font-bold text-yellow-700">{stats.expired.count}</p>
                  <p className="text-xs text-yellow-600">{stats.expired.credits} 积分</p>
                </div>
                <div className="bg-red-50 p-4 border border-red-200">
                  <p className="text-xs text-red-600">已禁用</p>
                  <p className="text-xl font-bold text-red-700">{stats.disabled.count}</p>
                  <p className="text-xs text-red-600">{stats.disabled.credits} 积分</p>
                </div>
              </div>

              {/* 7天趋势 */}
              {trend.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[#4b5563] mb-2">最近 7 天使用趋势</p>
                  <div className="flex items-end gap-1 h-16">
                    {trend.map((item) => {
                      const maxCount = Math.max(...trend.map((t) => t.count), 1);
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div
                          key={item.date}
                          className="flex-1 flex flex-col items-center"
                          title={`${item.date}: ${item.count} 次, ${item.credits} 积分`}
                        >
                          <div
                            className="w-full bg-[#8C7355] rounded-t"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <span className="text-[10px] text-[#4b5563] mt-1">
                            {item.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoadingStats && (
            <div className="py-4 text-center text-[#4b5563]">加载统计中...</div>
          )}

          {/* 生成兑换码表单 */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#4b5563] font-bold">
              生成兑换码
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#4b5563]">积分数量</label>
                <input
                  type="number"
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  min={1}
                  max={10000}
                  className="bg-[#faf9f6] border border-[#e5e5e1] p-2 text-sm focus:outline-none focus:border-[#8C7355]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#4b5563]">生成数量</label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="bg-[#faf9f6] border border-[#e5e5e1] p-2 text-sm focus:outline-none focus:border-[#8C7355]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#4b5563]">过期时间（可选）</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="bg-[#faf9f6] border border-[#e5e5e1] p-2 text-sm focus:outline-none focus:border-[#8C7355]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#4b5563]">备注（可选）</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="如：VIP客户、推广活动"
                  className="bg-[#faf9f6] border border-[#e5e5e1] p-2 text-sm focus:outline-none focus:border-[#8C7355]"
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-[#8C7355] hover:bg-[#2d3436] disabled:bg-[#9ca3af] text-white px-6 py-2 text-xs uppercase tracking-[0.2em] transition-colors"
            >
              {isGenerating ? "生成中..." : "生成兑换码"}
            </button>
            {generateError && (
              <p className="text-red-500 text-sm">{generateError}</p>
            )}
          </div>

          {/* 生成结果 */}
          {generatedCodes.length > 0 && (
            <div className="bg-green-50 border border-green-200 p-4 space-y-3">
              <p className="text-sm text-green-800 font-medium">
                成功生成 {generatedCodes.length} 个兑换码
              </p>
              <div className="space-y-2">
                {generatedCodes.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-between bg-white p-2 border border-green-100"
                  >
                    <code className="text-sm font-mono tracking-wider">
                      {code}
                    </code>
                    <button
                      onClick={() => handleCopy(code)}
                      className="text-xs text-[#8C7355] hover:text-[#1a1a1a] transition-colors"
                    >
                      {copiedCode === code ? "已复制" : "复制"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 兑换码列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <h4 className="text-xs uppercase tracking-[0.2em] text-[#4b5563] font-bold">
                  兑换码列表
                </h4>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="text-xs px-3 py-1 bg-[#faf9f6] text-[#4b5563] hover:bg-[#e5e5e1] disabled:opacity-50 border border-[#e5e5e1] transition-colors"
                >
                  {isExporting ? "导出中..." : "导出 CSV"}
                </button>
              </div>
              <div className="flex gap-2">
                {["all", "active", "used", "expired", "disabled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                    className={`text-xs px-3 py-1 transition-colors ${
                      statusFilter === s
                        ? "bg-[#8C7355] text-white"
                        : "bg-[#faf9f6] text-[#4b5563] hover:bg-[#e5e5e1]"
                    }`}
                  >
                    {s === "all" ? "全部" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-[#4b5563]">加载中...</div>
            ) : codes.length === 0 ? (
              <div className="py-8 text-center text-[#4b5563]">暂无兑换码</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#faf9f6] border-b border-[#e5e5e1]">
                      <tr>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#4b5563]">
                          兑换码
                        </th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#4b5563]">
                          积分
                        </th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#4b5563]">
                          状态
                        </th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#4b5563]">
                          创建时间
                        </th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#4b5563]">
                          备注
                        </th>
                        <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#4b5563]">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map((code) => (
                        <tr
                          key={code.id}
                          className="border-b border-[#e5e5e1] hover:bg-[#faf9f6]/50"
                        >
                          <td className="py-3 px-4 font-mono tracking-wider">
                            {code.code}
                          </td>
                          <td className="py-3 px-4">{code.credits}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[code.status]}`}
                            >
                              {STATUS_LABELS[code.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#4b5563]">
                            {new Date(code.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-[#4b5563] max-w-[150px] truncate">
                            {code.note || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCopy(code.code)}
                                className="text-xs text-[#8C7355] hover:text-[#1a1a1a]"
                              >
                                {copiedCode === code.code ? "已复制" : "复制"}
                              </button>
                              {code.status === "active" && (
                                <button
                                  onClick={() => handleDisable(code.id)}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  禁用
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#4b5563]">
                    共 {total} 条记录
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="text-xs px-3 py-1 bg-[#faf9f6] text-[#4b5563] hover:bg-[#e5e5e1] disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span className="text-xs text-[#4b5563] px-2 py-1">
                      {page} / {Math.ceil(total / 10) || 1}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= Math.ceil(total / 10)}
                      className="text-xs px-3 py-1 bg-[#faf9f6] text-[#4b5563] hover:bg-[#e5e5e1] disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RedemptionCodeManager;
