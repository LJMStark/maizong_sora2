export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function hasAuthUser(result: unknown): boolean {
  const candidate = result as
    | { data?: { user?: unknown | null } | null; user?: unknown | null }
    | null
    | undefined;

  return Boolean(candidate?.data?.user ?? candidate?.user);
}

export async function resolveHasAuthUser(
  getClientSession: () => Promise<unknown>,
  timeoutMs = 1500
): Promise<boolean> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  const latestSession = await Promise.race([
    getClientSession().catch(() => null),
    timeout,
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (hasAuthUser(latestSession)) return true;

  try {
    const response = await fetch("/api/auth/get-session", {
      credentials: "include",
    });
    if (!response.ok) return false;

    return hasAuthUser(await response.json());
  } catch {
    return false;
  }
}

/**
 * Extracts the role from a Better Auth session user object.
 * Better Auth's client-side type does not include `role` by default,
 * but it is present as an additionalField on the user schema.
 */
export function getUserRole(user: Record<string, unknown> | null | undefined): string | undefined {
  if (!user) return undefined;
  const role = (user as Record<string, unknown>).role;
  return typeof role === "string" ? role : undefined;
}

export function isAdmin(user: Record<string, unknown> | null | undefined): boolean {
  return getUserRole(user) === "admin";
}
