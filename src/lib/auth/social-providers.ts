export type SocialAuthProviderId = "google" | "apple" | "microsoft";

export type SocialProviderAvailability = Record<SocialAuthProviderId, boolean>;

type BetterAuthSocialProviders = NonNullable<
  Parameters<typeof import("better-auth").betterAuth>[0]["socialProviders"]
>;

const hasValue = (value: string | undefined) => Boolean(value?.trim());

export function getSocialProviderAvailability(): SocialProviderAvailability {
  return {
    google:
      hasValue(process.env.GOOGLE_CLIENT_ID) &&
      hasValue(process.env.GOOGLE_CLIENT_SECRET),
    apple:
      hasValue(process.env.APPLE_CLIENT_ID) &&
      hasValue(process.env.APPLE_CLIENT_SECRET),
    microsoft:
      hasValue(process.env.MICROSOFT_CLIENT_ID) &&
      hasValue(process.env.MICROSOFT_CLIENT_SECRET),
  };
}

export function getBetterAuthSocialProviders(): BetterAuthSocialProviders {
  const availability = getSocialProviderAvailability();
  const providers: BetterAuthSocialProviders = {};

  if (availability.google) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };
  }

  if (availability.apple) {
    providers.apple = {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    };
  }

  if (availability.microsoft) {
    providers.microsoft = {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
      authority:
        process.env.MICROSOFT_AUTHORITY ||
        "https://login.microsoftonline.com",
      prompt: "select_account",
    };
  }

  return providers;
}

export function hasConfiguredSocialProviders() {
  return Object.values(getSocialProviderAvailability()).some(Boolean);
}
