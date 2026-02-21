import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
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
      if (pkg.type === "subscription" && pkg.credits !== null && pkg.credits < 0) {
        return { error: "会员套餐月初始积分配置无效", status: 400 as const };
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
        const today = formatDateOnly(new Date());

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

        const purchasedBalance = userUpdated[0].newBalance;
        const activeSubscriptionRows = await tx
          .select({
            dailyCreditsRemaining: userSubscription.dailyCreditsRemaining,
            monthlyCreditsRemaining: userSubscription.monthlyCreditsRemaining,
          })
          .from(userSubscription)
          .where(
            and(
              eq(userSubscription.userId, order.userId),
              eq(userSubscription.status, "active"),
              lte(userSubscription.startDate, today),
              gte(userSubscription.endDate, today)
            )
          )
          .orderBy(desc(userSubscription.createdAt))
          .limit(1);

        const subscriptionBalance =
          (activeSubscriptionRows[0]?.dailyCreditsRemaining ?? 0) +
          (activeSubscriptionRows[0]?.monthlyCreditsRemaining ?? 0);
        const balanceAfter = purchasedBalance + subscriptionBalance;
        const balanceBefore = balanceAfter - packageCredits;

        await tx.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: order.userId,
          type: "addition",
          amount: packageCredits,
          balanceBefore,
          balanceAfter,
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
      const subscriptionMonthlyCredits = Math.max(0, pkg.credits ?? 0);
      const subscriptionDurationDays = pkg.durationDays as number;

      const now = new Date();
      const startDate = formatDateOnly(now);
      const endDate = formatDateOnly(addDays(now, subscriptionDurationDays - 1));

      // 同一时间仅保留一条有效订阅，避免多订阅叠加导致额度冲突
      await tx
        .update(userSubscription)
        .set({ status: "expired" })
        .where(
          and(
            eq(userSubscription.userId, order.userId),
            eq(userSubscription.status, "active")
          )
        );

      const createdSubscriptions = await tx
        .insert(userSubscription)
        .values({
          id: crypto.randomUUID(),
          userId: order.userId,
          packageId: pkg.id,
          startDate,
          endDate,
          dailyCredits: subscriptionDailyCredits,
          dailyCreditsRemaining: subscriptionDailyCredits,
          monthlyCredits: subscriptionMonthlyCredits,
          monthlyCreditsRemaining: subscriptionMonthlyCredits,
          monthlyCycleIndex: 0,
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

      const userCreditsRows = await tx
        .select({ purchasedCredits: user.credits })
        .from(user)
        .where(eq(user.id, order.userId))
        .limit(1);

      if (userCreditsRows.length === 0) {
        throw new Error(`订单用户不存在: ${order.userId}`);
      }

      const purchasedCredits = userCreditsRows[0].purchasedCredits;
      const openingCredits = subscriptionDailyCredits + subscriptionMonthlyCredits;

      if (openingCredits > 0) {
        await tx.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: order.userId,
          type: "addition",
          amount: openingCredits,
          balanceBefore: purchasedCredits,
          balanceAfter: purchasedCredits + openingCredits,
          reason: `会员开通额度生效 - ${order.id}`,
          referenceType: "subscription",
          referenceId: subscriptionId,
          metadata: {
            openingCredits: {
              monthly: subscriptionMonthlyCredits,
              daily: subscriptionDailyCredits,
            },
          },
        });
      }

      return {
        success: true as const,
        order: paidOrders[0],
        entitlement: {
          type: "subscription" as const,
          subscriptionId,
          monthlyCredits: subscriptionMonthlyCredits,
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
