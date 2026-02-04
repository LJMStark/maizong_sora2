
/**
 * Sanitizes error messages for public consumption.
 * Hides internal errors while preserving known application errors.
 */
export function sanitizeError(error: unknown): string {
  // Log the full error internally
  console.error("[Internal Error]:", error);

  if (error instanceof Error) {
    // If it's a Zod error (usually thrown as a ZodError, but message might be exposed if handled elsewhere)
    // For now, if the error message is generic "Internal Server Error", we keep it.
    // If it contains "API key" or sensitive env var names, we definitely want to hide it.
    
    const message = error.message.toLowerCase();
    
    // Simple heuristic to redact secrets
    if (message.includes("key") || message.includes("token") || message.includes("secret") || message.includes("env")) {
      return "An underlying service error occurred. Please try again later.";
    }

    // Allow Zod-like validation messages or custom app errors to pass through
    // provided they don't look like code dumps.
    // This is a permissive strategy; for higher security, we should whitelist error types.
    return error.message;
  }

  return "An unexpected error occurred";
}
