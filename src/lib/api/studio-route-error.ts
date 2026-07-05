import { NextResponse } from "next/server";
import { StudioSessionAccessError } from "@/features/studio/services/studio-session-service";
import { sanitizeError } from "@/lib/security/error-handler";

/**
 * Maps a studio route error to a JSON response: known domain errors carry their
 * own status (session access → 404), anything else is sanitized and returned as
 * 500. Centralizes the identical catch handling across the studio session and
 * generation routes.
 */
export function studioRouteErrorResponse(error: unknown): NextResponse {
  if (error instanceof StudioSessionAccessError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
}
