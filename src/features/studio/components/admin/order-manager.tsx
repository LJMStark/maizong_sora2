"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

  if (loading) {
    return <div className="text-sm text-[#4b5563] animate-pulse">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("pending");
              setPage(1);
            }}
          >
            待处理
          </Button>
          <Button
            variant={statusFilter === "paid" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("paid");
              setPage(1);
            }}
          >
            已支付
          </Button>
          <Button
            variant={statusFilter === "cancelled" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("cancelled");
              setPage(1);
            }}
          >
            已取消
          </Button>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
          >
            全部
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearchKeyword(searchInput.trim());
              }
            }}
            placeholder="搜索订单号、用户名、邮箱"
            className="max-w-sm"
          />
          <Button
            size="sm"
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
            onClick={() => {
              setSearchInput("");
              setSearchKeyword("");
              setPage(1);
            }}
          >
            清空
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            刷新
          </Button>
          <span className="text-xs text-[#4b5563]">
            共 {total} 条
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e5e5e1] p-8 text-center text-[#4b5563]">
          暂无订单
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg border border-[#e5e5e1] p-4 space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">
                    {order.packageName || "未知套餐"}{" "}
                    <span className="text-xs text-[#4b5563]">
                      ({order.packageType === "subscription" ? "会员订阅" : "积分包"})
                    </span>
                  </p>
                  <p className="text-xs text-[#4b5563] mt-1">
                    订单号：{order.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1a1a1a]">
                    {formatAmount(order.amount)}
                  </p>
                  <p className="text-xs text-[#4b5563] mt-1">
                    {new Date(order.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#4b5563]">
                <div>用户：{order.userName || "未知用户"}（{order.userEmail || order.userId}）</div>
                <div>状态：{order.status}</div>
              </div>

              {order.status === "pending" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-[#4b5563]">备注（可选）</label>
                    <Input
                      value={remarkDrafts[order.id] || ""}
                      onChange={(e) =>
                        setRemarkDrafts((prev) => ({
                          ...prev,
                          [order.id]: e.target.value,
                        }))
                      }
                      placeholder="记录支付渠道、流水号等"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateOrder(order.id, "mark_paid")}
                      disabled={processingOrderId === order.id}
                    >
                      {processingOrderId === order.id ? "处理中..." : "确认已支付并发放"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateOrder(order.id, "cancel")}
                      disabled={processingOrderId === order.id}
                    >
                      取消订单
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#4b5563]">
                  <div>
                    处理时间：
                    {order.paidAt
                      ? new Date(order.paidAt).toLocaleString("zh-CN")
                      : "-"}
                  </div>
                  <div>备注：{order.remark || "-"}</div>
                </div>
              )}
            </div>
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
          >
            上一页
          </Button>
          <span className="text-sm text-[#4b5563]">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
