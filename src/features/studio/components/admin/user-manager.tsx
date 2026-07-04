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
import { Ban, Pencil, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";

interface User {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: string;
  credits: number;
  dailyFastVideoLimit: number | null;
  dailyQualityVideoLimit: number | null;
  createdAt: string;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function UserManager() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [disableUser, setDisableUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: "", credits: 0 });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (searchKeyword.trim()) {
        params.set("search", searchKeyword.trim());
      }
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setData(json.data);
    } catch (error) {
      console.error("加载用户列表失败:", error);
      toast.error(`加载用户失败：${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [page, searchKeyword]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(searchInput.trim());
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ role: user.role, credits: user.credits });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setEditUser(null);
      fetchUsers();
    } catch (error) {
      console.error("保存用户信息失败:", error);
      toast.error(`保存用户失败：${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          json?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      setDisableUser(null);
      fetchUsers();
    } catch (error) {
      console.error("禁用用户失败:", error);
      toast.error(`禁用用户失败：${getErrorMessage(error)}`);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "管理员";
      case "member": return "会员";
      case "disabled": return "已禁用";
      default: return role;
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-blue-50 text-blue-700";
      case "member": return "bg-gray-100 text-gray-600";
      case "disabled": return "bg-red-50 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const formatLimit = (value: number | null) => {
    if (value === null) return "跟随系统";
    if (value === -1) return "不限";
    if (value === 0) return "停用";
    return `${value} 次/天`;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#ececec] pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex h-10 w-full items-center gap-3 rounded-full bg-[#f4f4f4] px-4 lg:max-w-md">
            <Search className="size-4 shrink-0 text-[#777]" strokeWidth={1.9} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索用户名、邮箱"
              aria-label="搜索用户名、邮箱"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#777]"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <Button
              size="sm"
              onClick={handleSearch}
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
            >
              搜索
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSearchKeyword("");
                setPage(1);
              }}
              className="rounded-full"
            >
              清空
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="rounded-full"
            >
              <RefreshCw className="size-4" strokeWidth={1.9} />
              <span className="hidden sm:inline">刷新</span>
            </Button>
          </div>
          {data && (
            <span className="text-sm text-[#777] lg:ml-auto">
              共 {data.total} 个用户
            </span>
          )}
        </div>
        {searchKeyword && (
          <p className="text-xs text-[#777]">当前搜索：{searchKeyword}</p>
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
      ) : !data || data.users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d8d8d8] px-6 py-12 text-center text-[#777]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f4f4f4]">
            <Users className="size-5" strokeWidth={1.9} />
          </div>
          <p className="mt-2">{searchKeyword ? "没有匹配的用户" : "暂无用户"}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
            <div className="hidden grid-cols-[minmax(230px,1.35fr)_110px_100px_minmax(210px,1fr)_88px] items-center border-b border-[#ececec] bg-[#fbfbfb] px-4 py-2.5 text-xs text-[#777] md:grid">
              <span>用户</span>
              <span>角色</span>
              <span>积分</span>
              <span>限额</span>
              <span className="text-right">操作</span>
            </div>
            {data.users.map((u) => {
              const initials = (u.name || u.email || "用").trim().slice(0, 1).toUpperCase();
              const disabled = u.role === "disabled";

              return (
                <article
                  key={u.id}
                  className="border-b border-[#ececec] px-4 py-3 last:border-b-0 transition-colors hover:bg-[#fbfbfb]"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(230px,1.35fr)_110px_100px_minmax(210px,1fr)_88px] md:items-center">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-sm font-medium text-white">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt=""
                            className="size-full rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium text-[#0d0d0d]">
                          {u.name || "未命名用户"}
                        </h3>
                        <p className="mt-1 truncate text-xs text-[#777]">
                          {u.email}
                        </p>
                        <p className="mt-1 text-xs text-[#8a8a8a]">
                          {u.username ? `@${u.username}` : "未设置用户名"} · {formatDate(u.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:block">
                      <span className="text-xs text-[#777] md:hidden">角色</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleColor(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                      {u.role === "admin" && (
                        <span className="mt-1 hidden items-center gap-1.5 text-xs text-[#777] md:flex">
                          <ShieldCheck className="size-3.5" strokeWidth={1.9} />
                          后台
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-[#0d0d0d] md:block">
                      <span className="text-xs text-[#777] md:hidden">积分</span>
                      <span>{u.credits}</span>
                    </div>

                    <div className="grid gap-1 text-xs text-[#777] sm:grid-cols-2 md:block md:space-y-1">
                      <span className="rounded-md bg-[#f7f7f7] px-2.5 py-1 md:block">
                        快速：{formatLimit(u.dailyFastVideoLimit)}
                      </span>
                      <span className="rounded-md bg-[#f7f7f7] px-2.5 py-1 md:block">
                        质量：{formatLimit(u.dailyQualityVideoLimit)}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-full p-2 text-[#777] transition-colors hover:bg-black/5 hover:text-[#0d0d0d]"
                        aria-label={`编辑用户 ${u.name || u.email}`}
                        title="编辑"
                      >
                        <Pencil className="size-4" strokeWidth={1.9} />
                      </button>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => setDisableUser(u)}
                          className="rounded-full p-2 text-[#777] transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`禁用用户 ${u.name || u.email}`}
                          title="禁用"
                        >
                          <Ban className="size-4" strokeWidth={1.9} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
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

      <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
        <DialogContent
          data-studio-dialog-surface="admin-user-edit"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#0d0d0d]">编辑用户</DialogTitle>
            <DialogDescription className="sr-only">编辑用户信息</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="text-sm text-[#777]">
                <span className="font-medium text-[#0d0d0d]">{editUser.name}</span>
                {" "}({editUser.email})
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  aria-label="用户角色"
                  className="h-10 w-full rounded-full border border-[#d9d9d9] bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-black/10"
                >
                  <option value="member">会员</option>
                  <option value="admin">管理员</option>
                  <option value="disabled">已禁用</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0d0d0d]">积分</label>
                <Input
                  type="number"
                  value={editForm.credits}
                  onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                  min={0}
                  aria-label="用户积分"
                  inputMode="numeric"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)} className="rounded-full">取消</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]">
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disableUser} onOpenChange={(open) => { if (!open) setDisableUser(null); }}>
        <DialogContent
          data-studio-dialog-surface="admin-user-disable"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-medium text-[#0d0d0d]">
              禁用用户
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#777]">
              {disableUser
                ? `确认禁用「${disableUser.name}」？该用户将无法继续使用账号功能。`
                : "确认禁用该用户？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDisableUser(null)} className="rounded-full">
              取消
            </Button>
            <Button
              onClick={() => disableUser && handleDisable(disableUser)}
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
