// Fallback credit prices used when system_config rows (credit_cost_*) are
// absent or not yet loaded. Imported by both the server config service and
// client components so the pre-fetch UI shows the same numbers the server
// would charge by default.
export const DEFAULT_CREDIT_COSTS = {
  videoFast: 30,
  videoQuality: 100,
  image: 10,
  pptPage: 10,
} as const;
