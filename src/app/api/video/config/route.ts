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

    const [fastLimit, qualityLimit] = await Promise.all([
      videoLimitService.getEffectiveLimit(session.user.id, "fast"),
      videoLimitService.getEffectiveLimit(session.user.id, "quality"),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        fastProvider: config.providers.fast,
        qualityProvider: config.providers.quality,
        creditCosts: config.creditCosts,
        dailyLimits: {
          fast: fastLimit,
          quality: qualityLimit,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
