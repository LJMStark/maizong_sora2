import { NextRequest, NextResponse } from "next/server";
import {
  getXiaoxiaodongGalleryBase,
  xiaoxiaodongTopicFileName,
} from "@/features/studio/data/xiaoxiaodong-cdn";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

export const revalidate = 3600;

function catalogUrl(topic?: string | null) {
  const base = getXiaoxiaodongGalleryBase();
  if (!base) return null;
  if (!topic) return `${base}/index.json`;
  return `${base}/topics/${xiaoxiaodongTopicFileName(topic)}`;
}

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic");
  const url = catalogUrl(topic);

  if (!url) {
    return NextResponse.json({ error: "图库未配置" }, { status: 503 });
  }

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return NextResponse.json(
        { error: "图库暂不可用" },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[XiaoxiaodongGallery]", sanitizeApiErrorMessage(error));
    return NextResponse.json({ error: "图库暂不可用" }, { status: 502 });
  }
}
