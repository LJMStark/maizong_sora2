import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoLimitService } from "@/features/studio/services/video-limit-service";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const config = await videoLimitService.getVideoGenerationConfig();

    return NextResponse.json({
      success: true,
      data: {
        fastProvider: config.providers.fast,
        qualityProvider: config.providers.quality,
        creditCosts: config.creditCosts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
