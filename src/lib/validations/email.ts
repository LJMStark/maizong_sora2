const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lightweight client-side email shape check (not RFC-exhaustive). */
export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
