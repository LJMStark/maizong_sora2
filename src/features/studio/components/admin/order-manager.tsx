"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, RefreshCw, Search, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "paid" | "cancelled";
type OrderStatusFilter = OrderStatus | "all";
type PackageType = "package" | "subscription";

interface OrderItem {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  status: OrderStatus;
  remark: string | null;
  createdAt: string;
  paidAt: string | null;
  userName: string | null;
  userEmail: string | null;
  packageName: string | null;
  packageType: PackageType | null;
}

interface OrderListResponse {
  success: boolean;
  data: {
    items: OrderItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    status: OrderStatus | null;
    q: string | null;
  };
}

function formatAmount(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "待处理";
    case "paid":
      return "已支付";
    case "cancelled":
      return "已取消";
  }
}

function getStatusClass(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-[#fff7db] text-[#8a5a00]";
    case "paid":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-gray-100 text-gray-600";
  }
}

function getPackageTypeLabel(type: PackageType | null): string {
  return type === "subscription" ? "会员订阅" : "积分包";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderManager() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (searchKeyword) {
        params.set("q", searchKeyword);
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const data: OrderListResponse | null = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data && "data" in data ? "加载订单失败" : `请求失败（状态码 ${response.status}）`);
      }
      setOrders(data.data.items);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
      setRemarkDrafts(
        Object.fromEntries(
          data.data.items.map((item) => [item.id, item.remark || ""])
        )
      );
    } catch (error) {
      console.error("加载订单失败:", error);
      toast.error(`加载订单失败：${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [limit, page, searchKeyword, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrder = async (orderId: string, action: "mark_paid" | "cancel") => {
    setProcessingOrderId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          remark: (remarkDrafts[orderId] || "").trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            `请求失败（状态码 ${response.status}）`
        );
      }

      if (action === "mark_paid") {
        toast.success("订单已标记支付并完成发放");
      } else {
        toast.success("订单已取消");
      }

      await fetchOrders();
    } catch (error) {
      console.error("更新订单失败:", error);
      toast.error(`更新订单失败：${getErrorMessage(error)}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#ececec] pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <div className="flex w-max rounded-full bg-[#f4f4f4] p-1">
              {[
                ["pending", "待处理"],
                ["paid", "已支付"],
                ["cancelled", "已取消"],
                ["all", "全部"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value as OrderStatusFilter);
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
          <span className="text-sm text-[#777]">
            共 {total} 条订单
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex h-10 w-full items-center gap-3 rounded-full bg-[#f4f4f4] px-4 lg:max-w-md">
            <Search className="size-4 shrink-0 text-[#777]" strokeWidth={1.9} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setSearchKeyword(searchInput.trim());
                }
              }}
              placeholder="搜索订单号、用户名、邮箱"
              aria-label="搜索订单号、用户名、邮箱"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#777]"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <Button
              size="sm"
              className="rounded-full bg-[#0d0d0d] text-white hover:bg-[#2a2a2a]"
              onClick={() => {
                setPage(1);
                setSearchKeyword(searchInput.trim());
              }}
            >
              搜索
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setSearchInput("");
                setSearchKeyword("");
                setPage(1);
              }}
            >
              清空
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-full">
              <RefreshCw className="size-4" strokeWidth={1.9} />
              <span className="hidden sm:inline">刷新</span>
            </Button>
          </div>
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
              className="h-24 animate-pulse rounded-lg bg-[#f4f4f4]"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d8d8d8] bg-white px-6 py-12 text-center text-[#777]">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#f4f4f4]">
            <ShoppingBag className="size-5" strokeWidth={1.9} />
          </div>
          {searchKeyword ? "没有匹配的订单" : "暂无订单"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
          <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(130px,0.8fr)_90px_minmax(170px,1fr)_88px] items-center gap-3 border-b border-[#ececec] bg-[#fbfbfb] px-4 py-2.5 text-xs text-[#777] lg:grid">
            <span>订单</span>
            <span>用户</span>
            <span>金额</span>
            <span>处理</span>
            <span className="text-right">操作</span>
          </div>
          {orders.map((order) => (
            <article
              key={order.id}
              className="border-b border-[#ececec] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#fbfbfb]"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(180px,1.2fr)_minmax(130px,0.8fr)_90px_minmax(170px,1fr)_88px] lg:items-center lg:gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#0d0d0d]">
                      {order.packageName || "未知套餐"}
                    </p>
                    <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs text-[#777]">
                      {getPackageTypeLabel(order.packageType)}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-[#777]">
                    {order.id}
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    创建：{formatDateTime(order.createdAt)}
                  </p>
                </div>

                <div className="min-w-0 text-xs text-[#777]">
                  <p className="truncate text-sm font-medium text-[#0d0d0d]">
                    {order.userName || "未知用户"}
                  </p>
                  <p className="mt-1 truncate">
                    {order.userEmail || order.userId}
                  </p>
                </div>

                <div className="flex items-center gap-2 lg:block">
                  <span className="text-xs text-[#777] lg:hidden">金额</span>
                  <p className="text-sm font-semibold text-[#0d0d0d]">
                    {formatAmount(order.amount)}
                  </p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="space-y-2">
                  {order.status === "pending" ? (
                    <Input
                      value={remarkDrafts[order.id] || ""}
                      onChange={(e) =>
                        setRemarkDrafts((prev) => ({
                          ...prev,
                          [order.id]: e.target.value,
                        }))
                      }
                      placeholder="记录支付渠道、流水号等"
                      aria-label={`订单 ${order.id} 备注`}
                      autoComplete="off"
                      className="h-9 rounded-full border-[#d9d9d9] bg-white px-3 text-sm shadow-none"
                    />
                  ) : (
                    <div className="rounded-md bg-[#f7f7f7] px-3 py-2 text-xs text-[#777]">
                      <p>处理：{formatDateTime(order.paidAt)}</p>
                      <p className="mt-1 truncate">备注：{order.remark || "-"}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                  {order.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateOrder(order.id, "mark_paid")}
                        disabled={processingOrderId === order.id}
                        className="flex size-9 items-center justify-center rounded-full bg-[#0d0d0d] text-white transition hover:bg-[#2a2a2a] disabled:bg-[#d7d7d7]"
                        aria-label={`确认订单 ${order.id}`}
                        title={processingOrderId === order.id ? "处理中" : "确认"}
                      >
                        <Check className="size-4" strokeWidth={1.9} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateOrder(order.id, "cancel")}
                        disabled={processingOrderId === order.id}
                        className="flex size-9 items-center justify-center rounded-full text-[#777] transition hover:bg-black/5 hover:text-[#0d0d0d] disabled:text-[#c7c7c7]"
                        aria-label={`取消订单 ${order.id}`}
                        title="取消"
                      >
                        <X className="size-4" strokeWidth={1.9} />
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-[#f4f4f4] px-3 py-1 text-xs text-[#777]">
                      {order.status === "paid" ? "已发放" : "无需处理"}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {orders.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-full"
          >
            上一页
          </Button>
          <span className="text-sm text-[#777]">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-full"
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
