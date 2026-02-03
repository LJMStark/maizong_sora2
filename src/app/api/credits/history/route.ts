import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await creditService.getCreditHistory(session.user.id);

    const formattedHistory = history.map((txn) => ({
      id: txn.id,
      type: txn.type,
      amount: txn.amount,
      balanceBefore: txn.balanceBefore,
      balanceAfter: txn.balanceAfter,
      reason: txn.reason,
      referenceType: txn.referenceType,
      referenceId: txn.referenceId,
      createdAt: txn.createdAt,
    }));

    return NextResponse.json({ history: formattedHistory });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
