const FALLBACK_BASE_URL = "https://sora2.681023.xyz";

/**
 * Absolute origin of this deployment, used to build provider callback URLs.
 * Falls back to the production host when NEXT_PUBLIC_BASE_URL is unset.
 */
export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || FALLBACK_BASE_URL;
}
