"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
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
      fetchAnnouncements();
    } catch (error) {
      console.error("更新公告状态失败:", error);
      toast.error(`更新公告状态失败：${getErrorMessage(error)}`);
    }
  };

  const handleDelete = async (item: Announcement) => {
    if (!confirm(`确定删除公告「${item.title}」？`)) return;
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
      fetchAnnouncements();
    } catch (error) {
      console.error("删除公告失败:", error);
      toast.error(`删除公告失败：${getErrorMessage(error)}`);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#4b5563] animate-pulse">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#4b5563]">共 {announcements.length} 条公告</p>
        <Button onClick={openCreate} size="sm">
          <span className="material-symbols-outlined text-base">add</span>
          新建公告
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 text-[#4b5563]">
          <span className="material-symbols-outlined text-4xl text-[#d1d5db]">campaign</span>
          <p className="mt-2">暂无公告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-[#e5e5e1] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#1a1a1a] truncate">{item.title}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.isActive ? "启用" : "停用"}
                    </span>
                    <span className="text-xs text-[#9ca3af]">排序: {item.sortOrder}</span>
                  </div>
                  <p className="text-sm text-[#4b5563] mt-1 line-clamp-2">{item.content}</p>
                  <p className="text-xs text-[#9ca3af] mt-2">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="p-1.5 rounded hover:bg-[#faf9f6] transition-colors text-[#4b5563] hover:text-[#1a1a1a]"
                    title={item.isActive ? "停用" : "启用"}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {item.isActive ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded hover:bg-[#faf9f6] transition-colors text-[#4b5563] hover:text-[#1a1a1a]"
                    title="编辑"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors text-[#4b5563] hover:text-red-600"
                    title="删除"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑公告" : "新建公告"}</DialogTitle>
            <DialogDescription className="sr-only">
              {editing ? "编辑公告内容" : "创建新公告"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">标题</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="输入公告标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">内容</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="输入公告内容"
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">排序值</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="值越大越靠前"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  启用
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
