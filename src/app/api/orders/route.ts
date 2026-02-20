import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creditOrder, creditPackage, user } from "@/db/schema";
import { getServerSession } from "@/lib/auth/get-session";
import { and, desc, eq, gt } from "drizzle-orm";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";
import { rateLimiter } from "@/lib/rate-limit";

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await rateLimiter.limit(session.user.id, "default");
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const { packageId } = await request.json();

    if (typeof packageId !== "string" || !packageId.trim()) {
      return NextResponse.json(
        { error: "Package ID is required" },
        { status: 400 }
      );
    }

    const normalizedPackageId = packageId.trim();

    const userRecord = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (userRecord[0].role === "disabled") {
      return NextResponse.json({ error: "账户已被禁用" }, { status: 403 });
    }

    const pkg = await db
      .select()
      .from(creditPackage)
      .where(
        and(
          eq(creditPackage.id, normalizedPackageId),
          eq(creditPackage.isActive, true)
        )
      )
      .limit(1);

    if (pkg.length === 0) {
      return NextResponse.json(
        { error: "Package not found or inactive" },
        { status: 404 }
      );
    }

    const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const existingPendingOrder = await db
      .select({
        id: creditOrder.id,
      })
      .from(creditOrder)
      .where(
        and(
          eq(creditOrder.userId, session.user.id),
          eq(creditOrder.packageId, normalizedPackageId),
          eq(creditOrder.status, "pending"),
          gt(creditOrder.createdAt, recentThreshold)
        )
      )
      .orderBy(desc(creditOrder.createdAt))
      .limit(1);

    if (existingPendingOrder.length > 0) {
      return NextResponse.json({
        success: true,
        orderId: existingPendingOrder[0].id,
        package: pkg[0],
        reused: true,
      });
    }

    const orderId = generateOrderId();

    await db.insert(creditOrder).values({
      id: orderId,
      userId: session.user.id,
      packageId: normalizedPackageId,
      amount: pkg[0].price,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      orderId,
      package: pkg[0],
    });
  } catch (error) {
    console.error("[Orders] Error creating order:", error);
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json(
      { error: `创建订单失败：${message}` },
      { status: 500 }
    );
  }
}
