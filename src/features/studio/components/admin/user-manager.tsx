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

export default function UserManager() {
  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: "", credits: 0 });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
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
      const json = await res.json();
      if (json.success) {
        setEditUser(null);
        fetchUsers();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (user: User) => {
    if (!confirm(`确定禁用用户「${user.name}」？`)) return;
    try {
      await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      fetchUsers();
    } catch {
      // ignore
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="搜索用户名、邮箱..."
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={handleSearch}>
          搜索
        </Button>
        {data && (
          <span className="text-sm text-[#4b5563] ml-auto">
            共 {data.total} 个用户
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-[#4b5563] animate-pulse">加载中...</div>
      ) : !data || data.users.length === 0 ? (
        <div className="text-center py-12 text-[#4b5563]">
          <span className="material-symbols-outlined text-4xl text-[#d1d5db]">group</span>
          <p className="mt-2">暂无用户</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e1] text-left text-[#4b5563]">
                  <th className="py-2 px-3 font-medium">用户</th>
                  <th className="py-2 px-3 font-medium">角色</th>
                  <th className="py-2 px-3 font-medium">积分</th>
                  <th className="py-2 px-3 font-medium">注册时间</th>
                  <th className="py-2 px-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b border-[#f3f4f6] hover:bg-white transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{u.name}</p>
                        <p className="text-xs text-[#9ca3af]">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${roleColor(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">{u.credits}</td>
                    <td className="py-3 px-3 text-[#4b5563]">
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1 rounded hover:bg-[#faf9f6] text-[#4b5563] hover:text-[#1a1a1a]"
                          title="编辑"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {u.role !== "disabled" && (
                          <button
                            onClick={() => handleDisable(u)}
                            className="p-1 rounded hover:bg-red-50 text-[#4b5563] hover:text-red-600"
                            title="禁用"
                          >
                            <span className="material-symbols-outlined text-lg">block</span>
                          </button>
                        )}
                      </div>
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

      <Dialog open={!!editUser} onOpenChange={(v) => { if (!v) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription className="sr-only">编辑用户信息</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="text-sm text-[#4b5563]">
                <span className="font-medium text-[#1a1a1a]">{editUser.name}</span>
                {" "}({editUser.email})
              </div>
              <div>
                <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="member">会员</option>
                  <option value="admin">管理员</option>
                  <option value="disabled">已禁用</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#1a1a1a] mb-1 block">积分</label>
                <Input
                  type="number"
                  value={editForm.credits}
                  onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
