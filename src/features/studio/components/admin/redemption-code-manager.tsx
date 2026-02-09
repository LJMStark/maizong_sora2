"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface RedemptionCode {
  id: string;
  code: string;
  credits: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  note: string | null;
}

interface CodeListResponse {
  codes: RedemptionCode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function RedemptionCodeManager() {
  const [data, setData] = useState<CodeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ credits: 100, count: 1, note: "" });
  const [creating, setCreating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/redemption-codes?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/redemption-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedCodes(json.codes);
        fetchCodes();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (code: RedemptionCode) => {
    if (!confirm(`确定禁用兑换码「${code.code}」？`)) return;
    try {
      await fetch(`/api/admin/redemption-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disabled" }),
      });
      fetchCodes();
    } catch {
      // ignore
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "active": return "可用";
      case "used": return "已使用";
      case "expired": return "已过期";
      case "disabled": return "已禁用";
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-700";
      case "used": return "bg-blue-50 text-blue-700";
      case "expired": return "bg-yellow-50 text-yellow-700";
      case "disabled": return "bg-red-50 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none"
        >
          <option value="all">全部状态</option>
          <option value="active">可用</option>
          <option value="used">已使用</option>
          <option value="disabled">已禁用</option>
        </select>
        {data && (
          <span className="text-sm text-[#4b5563]">共 {data.total} 条</span>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setCreateOpen(true); setGeneratedCodes([]); }}>
            <span className="material-symbols-outlined text-base">add</span>
            生成兑换码
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[#4b5563] animate-pulse">加载中...</div>
      ) : !data || data.codes.length === 0 ? (
        <div className="text-center py-12 text-[#4b5563]">
          <span className="material-symbols-outlined text-4xl text-[#d1d5db]">confirmation_number</span>
          <p className="mt-2">暂无兑换码</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e1] text-left text-[#4b5563]">
                  <th className="py-2 px-3 font-medium">兑换码</th>
                  <th className="py-2 px-3 font-medium">积分</th>
                  <th className="py-2 px-3 font-medium">状态</th>
                  <th className="py-2 px-3 font-medium">备注</th>
                  <th className="py-2 px-3 font-medium">创建时间</th>
                  <th className="py-2 px-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.codes.map((c) => (
                  <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-white transition-colors">
                    <td className="py-3 px-3 font-mono text-xs">
                      <div className="flex items-center gap-1">
                        {c.code}
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="p-0.5 rounded hover:bg-[#faf9f6] text-[#9ca3af] hover:text-[#4b5563]"
                          title="复制"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono">{c.credits}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#4b5563] max-w-[120px] truncate">
                      {c.note || "-"}
                    </td>
                    <td className="py-3 px-3 text-[#4b5563]">
                      {new Date(c.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="py-3 px-3">
                      {c.status === "active" && (
                        <button
                          onClick={() => handleDisable(c)}
                          className="p-1 rounded hover:bg-red-50 text-[#4b5563] hover:text-red-600"
                          title="禁用"
                        >
                          <span className="material-symbols-outlined text-lg">block</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                上一页
              </Button>
              <span className="text-sm text-[#4b5563]">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成兑换码</DialogTitle>
            <DialogDescription className="sr-only">生成新的兑换码</DialogDescription>
          </DialogHeader>

          {generatedCodes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700 font-medium">
                成功生成 {generatedCodes.length} 个兑换码
              </p>
              <div className="bg-[#faf9f6] rounded-md p-3 space-y-1 max-h-48 overflow-y-auto">
                {generatedCodes.map((code) => (
                  <div key={code} className="flex items-center justify-between">
                    <span className="font-mono text-sm">{code}</span>
                    <button
                      onClick={() => copyToClipboard(code)}
                      className="p-1 rounded hover:bg-white text-[#4b5563]"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => copyToClipboard(generatedCodes.join("\n"))}
              >
                复制全部
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">积分数量</label>
                <Input
                  type="number"
                  value={createForm.credits}
                  onChange={(e) => setCreateForm({ ...createForm, credits: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={10000}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">生成数量</label>
                <Input
                  type="number"
                  value={createForm.count}
                  onChange={(e) => setCreateForm({ ...createForm, count: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">备注</label>
                <Input
                  value={createForm.note}
                  onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {generatedCodes.length > 0 ? "关闭" : "取消"}
            </Button>
            {generatedCodes.length === 0 && (
              <Button onClick={handleCreate} disabled={creating || createForm.credits < 1}>
                {creating ? "生成中..." : "生成"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
