import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creditOrder, creditPackage } from "@/db/schema";
import { getServerSession } from "@/lib/auth/get-session";
import { eq } from "drizzle-orm";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

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

  try {
    const { packageId } = await request.json();

    if (!packageId) {
      return NextResponse.json(
        { error: "Package ID is required" },
        { status: 400 }
      );
    }

    const pkg = await db
      .select()
      .from(creditPackage)
      .where(eq(creditPackage.id, packageId))
      .limit(1);

    if (pkg.length === 0) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    const orderId = generateOrderId();

    await db.insert(creditOrder).values({
      id: orderId,
      userId: session.user.id,
      packageId,
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
