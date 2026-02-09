export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
