"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Megaphone, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", content: "", isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setAnnouncements(json.data);
    } catch (error) {
      console.error("加载公告失败:", error);
      toast.error(`加载公告失败：${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", content: "", isActive: true, sortOrder: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/announcements/${editing.id}`
        : "/api/admin/announcements";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setDialogOpen(false);
      toast.success(editing ? "公告已更新" : "公告已创建");
      fetchAnnouncements();
    } catch (error) {
      console.error("保存公告失败:", error);
      toast.error(`保存公告失败：${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      toast.success(item.isActive ? "公告已停用" : "公告已启用");
      fetchAnnouncements();
    } catch (error) {
      console.error("更新公告状态失败:", error);
      toast.error(`更新公告状态失败：${getErrorMessage(error)}`);
    }
  };

  const handleDelete = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setDeleteTarget(null);
      toast.success("公告已删除");
      fetchAnnouncements();
    } catch (error) {
      console.error("删除公告失败:", error);
      toast.error(`删除公告失败：${getErrorMessage(error)}`);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return announcements.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? item.isActive : !item.isActive);
      const matchesKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword);

      return matchesStatus && matchesKeyword;
    });
  }, [announcements, query, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      all: announcements.length,
      active: announcements.filter((item) => item.isActive).length,
      inactive: announcements.filter((item) => !item.isActive).length,
    }),
    [announcements]
  );

  const filters = [
    ["all", "全部", statusCounts.all],
    ["active", "启用", statusCounts.active],
    ["inactive", "停用", statusCounts.inactive],
  ] as const;

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-20 animate-pulse rounded-lg bg-[#f4f4f4]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#ececec] pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777]"
              strokeWidth={1.9}
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索公告"
              aria-label="搜索公告"
              autoComplete="off"
              className="h-10 rounded-full border-[#d9d9d9] bg-white pl-9 pr-4 text-sm shadow-none"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="overflow-x-auto">
              <div className="flex w-max rounded-full bg-[#f4f4f4] p-1">
                {filters.map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    aria-pressed={statusFilter === value}
                    className={cn(
                      "h-9 rounded-full px-4 text-sm transition",
                      statusFilter === value
                        ? "bg-white text-[#0d0d0d] shadow-sm"
                        : "text-[#777] hover:text-[#0d0d0d]"
                    )}
                  >
                    {label}
                    <span className="ml-1 text-xs text-[#8a8a8a]">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={openCreate}
              size="sm"
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              <Plus className="size-4" strokeWidth={1.9} />
              新建公告
            </Button>
          </div>
        </div>

        <p className="text-sm text-[#777]">
          共 {announcements.length} 条公告
          {filteredAnnouncements.length !== announcements.length &&
            `，当前显示 ${filteredAnnouncements.length} 条`}
        </p>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d8d8d8] px-6 py-12 text-center text-[#777]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f4f4f4]">
            <Megaphone className="size-5" strokeWidth={1.9} />
          </div>
          <p className="mt-2">
            {announcements.length === 0 ? "暂无公告" : "没有匹配的公告"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
          <div className="hidden grid-cols-[minmax(220px,1fr)_84px_76px_140px_104px] items-center gap-3 border-b border-[#ececec] bg-[#fbfbfb] px-4 py-2.5 text-xs text-[#777] md:grid">
            <span>公告</span>
            <span>状态</span>
            <span>排序</span>
            <span>更新时间</span>
            <span className="text-right">操作</span>
          </div>

          {filteredAnnouncements.map((item) => (
            <article
              key={item.id}
              className="border-b border-[#ececec] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#fbfbfb]"
            >
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_84px_76px_140px_104px] md:items-center md:gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-[#0d0d0d]">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#777]">
                    {item.content}
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a] md:hidden">
                    创建于 {formatDateTime(item.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:block">
                  <span className="text-xs text-[#777] md:hidden">状态</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                      item.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {item.isActive ? "启用" : "停用"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-[#0d0d0d] md:block">
                  <span className="text-xs text-[#777] md:hidden">排序</span>
                  <span>{item.sortOrder}</span>
                </div>

                <div className="grid gap-1 text-xs text-[#777] sm:grid-cols-2 md:block md:space-y-1">
                  <span className="rounded-md bg-[#f7f7f7] px-2.5 py-1 md:block">
                    更新：{formatDateTime(item.updatedAt)}
                  </span>
                  <span className="rounded-md bg-[#f7f7f7] px-2.5 py-1 md:hidden">
                    创建：{formatDateTime(item.createdAt)}
                  </span>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className="rounded-full p-2 text-[#777] transition-colors hover:bg-black/5 hover:text-[#0d0d0d]"
                    aria-label={item.isActive ? `停用公告 ${item.title}` : `启用公告 ${item.title}`}
                    title={item.isActive ? "停用" : "启用"}
                  >
                    {item.isActive ? (
                      <EyeOff className="size-4" strokeWidth={1.9} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.9} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-full p-2 text-[#777] transition-colors hover:bg-black/5 hover:text-[#0d0d0d]"
                    aria-label={`编辑公告 ${item.title}`}
                    title="编辑"
                  >
                    <Pencil className="size-4" strokeWidth={1.9} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="rounded-full p-2 text-[#777] transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`删除公告 ${item.title}`}
                    title="删除"
                  >
                    <Trash2 className="size-4" strokeWidth={1.9} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-studio-dialog-surface="admin-announcement-edit"
          className="max-h-[min(720px,92vh)] overflow-y-auto rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#0d0d0d]">
              {editing ? "编辑公告" : "新建公告"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editing ? "编辑公告内容" : "创建新公告"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">标题</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="输入公告标题"
                aria-label="公告标题"
                autoComplete="off"
                className="h-10 rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">内容</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="输入公告内容"
                rows={4}
                aria-label="公告内容"
                autoComplete="off"
                className="w-full resize-none rounded-2xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-4 focus:ring-black/10"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">排序值</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="值越大越靠前"
                  aria-label="公告排序值"
                  inputMode="numeric"
                  className="h-10 rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#0d0d0d]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    aria-label="启用公告"
                    className="rounded border-gray-300"
                  />
                  启用
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-full">
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent
          data-studio-dialog-surface="admin-announcement-delete"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#0d0d0d]">
              删除公告
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#777]">
              {deleteTarget
                ? `确认删除「${deleteTarget.title}」？删除后不会再向用户展示。`
                : "确认删除该公告？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">
              取消
            </Button>
            <Button
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
