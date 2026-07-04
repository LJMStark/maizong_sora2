import { NextResponse } from "next/server";
import { getSocialProviderAvailability } from "@/lib/auth/social-providers";

export function GET() {
  return NextResponse.json({
    providers: getSocialProviderAvailability(),
  });
}
