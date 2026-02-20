import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import {
  creditOrder,
  creditPackage,
  creditTransaction,
  user,
  userSubscription,
} from "@/db/schema";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

type OrderAction = "mark_paid" | "cancel";

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const action = body?.action as OrderAction;
    const remark =
      typeof body?.remark === "string" ? body.remark.trim() : undefined;

    if (action !== "mark_paid" && action !== "cancel") {
      return NextResponse.json(
        { error: "action 必须是 mark_paid 或 cancel" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const orderRows = await tx
        .select()
        .from(creditOrder)
        .where(eq(creditOrder.id, id))
        .limit(1);

      if (orderRows.length === 0) {
        return { error: "订单不存在", status: 404 as const };
      }

      const order = orderRows[0];

      if (action === "cancel") {
        if (order.status === "paid") {
          return { error: "已支付订单不能取消", status: 400 as const };
        }

        if (order.status === "cancelled") {
          return {
            success: true as const,
            idempotent: true as const,
            order,
          };
        }

        const cancelled = await tx
          .update(creditOrder)
          .set({
            status: "cancelled",
            remark: remark === undefined ? order.remark : remark || null,
          })
          .where(
            and(eq(creditOrder.id, id), eq(creditOrder.status, "pending"))
          )
          .returning();

        if (cancelled.length === 0) {
          return { error: "订单状态已变更，请刷新后重试", status: 409 as const };
        }

        return { success: true as const, order: cancelled[0] };
      }

      if (order.status === "paid") {
        return {
          success: true as const,
          idempotent: true as const,
          order,
        };
      }

      if (order.status === "cancelled") {
        return { error: "已取消订单不能支付", status: 400 as const };
      }

      const packageRows = await tx
        .select()
        .from(creditPackage)
        .where(eq(creditPackage.id, order.packageId))
        .limit(1);

      if (packageRows.length === 0) {
        return { error: "套餐不存在", status: 400 as const };
      }

      const pkg = packageRows[0];
      if (order.amount !== pkg.price) {
        return { error: "订单金额与当前套餐价格不一致，请取消后重新下单", status: 409 as const };
      }
      if (pkg.type === "package" && (!pkg.credits || pkg.credits <= 0)) {
        return { error: "积分包配置无效", status: 400 as const };
      }
      if (pkg.type === "subscription" && (!pkg.dailyCredits || pkg.dailyCredits <= 0)) {
        return { error: "会员套餐每日积分配置无效", status: 400 as const };
      }
      if (pkg.type === "subscription" && (!pkg.durationDays || pkg.durationDays <= 0)) {
        return { error: "会员套餐时长配置无效", status: 400 as const };
      }

      const paidAt = new Date();

      const paidOrders = await tx
        .update(creditOrder)
        .set({
          status: "paid",
          paidAt,
          remark: remark === undefined ? order.remark : remark || null,
        })
        .where(and(eq(creditOrder.id, id), eq(creditOrder.status, "pending")))
        .returning();

      if (paidOrders.length === 0) {
        return { error: "订单状态已变更，请刷新后重试", status: 409 as const };
      }

      if (pkg.type === "package") {
        const packageCredits = pkg.credits as number;

        const userUpdated = await tx
          .update(user)
          .set({
            credits: sql`${user.credits} + ${packageCredits}`,
          })
          .where(eq(user.id, order.userId))
          .returning({
            newBalance: user.credits,
          });

        if (userUpdated.length === 0) {
          throw new Error(`订单用户不存在: ${order.userId}`);
        }

        const newBalance = userUpdated[0].newBalance;
        const balanceBefore = newBalance - packageCredits;

        await tx.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: order.userId,
          type: "addition",
          amount: packageCredits,
          balanceBefore,
          balanceAfter: newBalance,
          reason: `订单支付发放积分 - ${order.id}`,
          referenceType: "order",
          referenceId: order.id,
        });

        return {
          success: true as const,
          order: paidOrders[0],
          entitlement: {
            type: "package" as const,
            credits: packageCredits,
          },
        };
      }

      const subscriptionDailyCredits = pkg.dailyCredits as number;
      const subscriptionDurationDays = pkg.durationDays as number;

      const now = new Date();
      const startDate = formatDateOnly(now);
      const endDate = formatDateOnly(addDays(now, subscriptionDurationDays - 1));

      const createdSubscriptions = await tx
        .insert(userSubscription)
        .values({
          id: crypto.randomUUID(),
          userId: order.userId,
          packageId: pkg.id,
          startDate,
          endDate,
          dailyCredits: subscriptionDailyCredits,
          lastGrantDate: startDate,
          status: "active",
        })
        .returning({
          id: userSubscription.id,
        });

      const subscriptionId = createdSubscriptions[0]?.id;
      if (!subscriptionId) {
        throw new Error("创建订阅记录失败");
      }

      // 开通当日立即发放一次积分，避免用户等待到次日 cron
      const userUpdated = await tx
        .update(user)
        .set({
          credits: sql`${user.credits} + ${subscriptionDailyCredits}`,
        })
        .where(eq(user.id, order.userId))
        .returning({
          newBalance: user.credits,
        });

      if (userUpdated.length === 0) {
        throw new Error(`订单用户不存在: ${order.userId}`);
      }

      const newBalance = userUpdated[0].newBalance;
      const balanceBefore = newBalance - subscriptionDailyCredits;

      await tx.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: order.userId,
        type: "addition",
        amount: subscriptionDailyCredits,
        balanceBefore,
        balanceAfter: newBalance,
        reason: `会员开通当日发放 - ${order.id}`,
        referenceType: "subscription",
        referenceId: subscriptionId,
      });

      return {
        success: true as const,
        order: paidOrders[0],
        entitlement: {
          type: "subscription" as const,
          subscriptionId,
          dailyCredits: subscriptionDailyCredits,
          durationDays: subscriptionDurationDays,
          startDate,
          endDate,
        },
      };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      idempotent: "idempotent" in result ? result.idempotent : false,
      data: result,
    });
  } catch (error) {
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
