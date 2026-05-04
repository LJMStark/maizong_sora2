import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { sanitizeError } from "@/lib/security/error-handler";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const credits = await creditService.getUserCredits(session.user.id);

    return NextResponse.json({ credits });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
