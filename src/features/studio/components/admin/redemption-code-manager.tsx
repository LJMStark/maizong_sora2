"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyTextToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Ban, Copy, Download, Plus, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function RedemptionCodeManager() {
  const [data, setData] = useState<CodeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    credits: 100,
    count: 1,
    expiresAt: "",
    note: "",
  });
  const [creating, setCreating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState<RedemptionCode | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/redemption-codes?${params}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setData(json.data);
    } catch (error) {
      console.error("加载兑换码列表失败:", error);
      toast.error(`加载兑换码失败：${getErrorMessage(error)}`);
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
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setGeneratedCodes(json.codes);
      fetchCodes();
    } catch (error) {
      console.error("生成兑换码失败:", error);
      toast.error(`生成兑换码失败：${getErrorMessage(error)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (code: RedemptionCode) => {
    try {
      const res = await fetch(`/api/admin/redemption-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disabled" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setDisableCode(null);
      fetchCodes();
    } catch (error) {
      console.error("禁用兑换码失败:", error);
      toast.error(`禁用兑换码失败：${getErrorMessage(error)}`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await copyTextToClipboard(text);
      toast.success("已复制");
    } catch (error) {
      console.error("复制到剪贴板失败:", error);
      toast.error(`复制失败：${getErrorMessage(error)}`);
    }
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
      case "expired": return "bg-[#fff7db] text-[#8a5a00]";
      case "disabled": return "bg-red-50 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "长期有效";
    return new Date(value).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const filters = [
    ["all", "全部"],
    ["active", "可用"],
    ["used", "已使用"],
    ["disabled", "已禁用"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#ececec] pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <div className="flex w-max rounded-full bg-[#f4f4f4] p-1">
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  aria-pressed={statusFilter === value}
                  className={cn(
                    "h-9 rounded-full px-4 text-sm transition",
                    statusFilter === value
                      ? "bg-white text-[#0d0d0d] shadow-sm"
                      : "text-[#777] hover:text-[#0d0d0d]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-full bg-white text-[#0d0d0d] hover:bg-[#f4f4f4]"
            >
              <Link href={`/api/admin/redemption-codes/export?status=${statusFilter}`}>
                <Download className="size-4" strokeWidth={1.9} />
                导出
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => { setCreateOpen(true); setGeneratedCodes([]); }}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              <Plus className="size-4" strokeWidth={1.9} />
              生成兑换码
            </Button>
          </div>
        </div>
        {data && (
          <span className="text-sm text-[#777]">共 {data.total} 条兑换码</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-lg bg-[#f4f4f4]"
            />
          ))}
        </div>
      ) : !data || data.codes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d8d8d8] px-6 py-12 text-center text-[#777]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f4f4f4]">
            <Ticket className="size-5" strokeWidth={1.9} />
          </div>
          <p className="mt-2">
            {statusFilter === "all"
              ? "暂无兑换码"
              : `暂无${filters.find(([value]) => value === statusFilter)?.[1] ?? ""}兑换码`}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <div className="hidden grid-cols-[minmax(170px,1fr)_76px_64px_minmax(150px,0.9fr)_78px] items-center gap-2 border-b border-[#ececec] bg-[#fbfbfb] px-4 py-2.5 text-xs text-[#777] md:grid">
              <span>兑换码</span>
              <span>状态</span>
              <span>积分</span>
              <span>有效期</span>
              <span className="text-right">操作</span>
            </div>
            {data.codes.map((c) => (
              <article
                key={c.id}
                className="border-b border-[#ececec] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#fbfbfb]"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(170px,1fr)_76px_64px_minmax(150px,0.9fr)_78px] md:items-center md:gap-2">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <code className="min-w-0 break-all rounded-md bg-[#f7f7f7] px-2.5 py-1 font-mono text-sm text-[#0d0d0d]">
                        {c.code}
                      </code>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#777]">
                      {c.note || "无备注"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:block">
                    <span className="text-xs text-[#777] md:hidden">状态</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[#0d0d0d] md:block">
                    <span className="text-xs text-[#777] md:hidden">积分</span>
                    <span>{c.credits}</span>
                  </div>

                  <div className="grid gap-1 text-xs text-[#777] sm:grid-cols-2 md:block md:space-y-1">
                    <span className="rounded-md bg-[#f7f7f7] px-2.5 py-1 md:block">
                      到期：{formatDate(c.expiresAt)}
                    </span>
                    <span className="rounded-md bg-[#f7f7f7] px-2.5 py-1 md:block">
                      创建：{formatDate(c.createdAt)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(c.code)}
                      className="rounded-full p-2 text-[#777] transition-colors hover:bg-black/5 hover:text-[#0d0d0d]"
                      aria-label={`复制兑换码 ${c.code}`}
                      title="复制"
                    >
                      <Copy className="size-4" strokeWidth={1.9} />
                    </button>
                      {c.status === "active" && (
                        <button
                          type="button"
                          onClick={() => setDisableCode(c)}
                          className="rounded-full p-2 text-[#777] transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`禁用兑换码 ${c.code}`}
                          title="禁用"
                        >
                          <Ban className="size-4" strokeWidth={1.9} />
                        </button>
                      )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full"
              >
                上一页
              </Button>
              <span className="text-sm text-[#777]">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
                className="rounded-full"
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          data-studio-dialog-surface="admin-redemption-create"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#0d0d0d]">生成兑换码</DialogTitle>
            <DialogDescription className="sr-only">生成新的兑换码</DialogDescription>
          </DialogHeader>

          {generatedCodes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-green-700">
                成功生成 {generatedCodes.length} 个兑换码
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-[#f7f7f7] p-3">
                {generatedCodes.map((code) => (
                  <div key={code} className="flex items-center justify-between">
                    <span className="font-mono text-sm">{code}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(code)}
                      className="rounded-full p-1 text-[#777] hover:bg-white hover:text-[#0d0d0d]"
                      aria-label={`复制兑换码 ${code}`}
                    >
                      <Copy className="size-3.5" strokeWidth={1.9} />
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
                <Copy className="size-4" strokeWidth={1.9} />
                复制全部
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">积分数量</label>
                <Input
                  type="number"
                  value={createForm.credits}
                  onChange={(e) => setCreateForm({ ...createForm, credits: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={10000}
                  aria-label="兑换码积分数量"
                  inputMode="numeric"
                  className="h-10 rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">生成数量</label>
                <Input
                  type="number"
                  value={createForm.count}
                  onChange={(e) => setCreateForm({ ...createForm, count: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={100}
                  aria-label="兑换码生成数量"
                  inputMode="numeric"
                  className="h-10 rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">过期时间</label>
                <Input
                  type="datetime-local"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  aria-label="兑换码过期时间"
                  className="h-10 rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">备注</label>
                <Input
                  value={createForm.note}
                  onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                  placeholder="可选"
                  aria-label="兑换码备注"
                  autoComplete="off"
                  className="h-10 rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full">
              {generatedCodes.length > 0 ? "关闭" : "取消"}
            </Button>
            {generatedCodes.length === 0 && (
              <Button
                onClick={handleCreate}
                disabled={creating || createForm.credits < 1}
                className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
              >
                {creating ? "生成中..." : "生成"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disableCode} onOpenChange={(open) => { if (!open) setDisableCode(null); }}>
        <DialogContent
          data-studio-dialog-surface="admin-redemption-disable"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#0d0d0d]">
              禁用兑换码
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#777]">
              {disableCode
                ? `确认禁用「${disableCode.code}」？禁用后该兑换码不能再被使用。`
                : "确认禁用该兑换码？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDisableCode(null)} className="rounded-full">
              取消
            </Button>
            <Button
              onClick={() => disableCode && handleDisable(disableCode)}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              确认禁用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
