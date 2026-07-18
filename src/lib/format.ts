/**
 * Converts a price in cents to a yuan string with two decimals, e.g. 1990 →
 * "19.90". Pass `trimZeroFen` to drop a trailing ".00" for whole-yuan display.
 */
export function centsToYuan(
  cents: number,
  options?: { trimZeroFen?: boolean }
): string {
  const yuan = (cents / 100).toFixed(2);
  return options?.trimZeroFen ? yuan.replace(/\.00$/, "") : yuan;
}

/** Formats a price in cents as "¥19.90". */
export function formatYuan(cents: number): string {
  return `¥${centsToYuan(cents)}`;
}

const TASK_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formats a task timestamp as zh-CN "M月d日 HH:mm" for workshop task lists. */
export function formatTaskDate(value: string): string {
  return TASK_DATE_FORMATTER.format(new Date(value));
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "short",
  day: "numeric",
});

/** Formats a timestamp as zh-CN "M月d日" for compact session lists. */
export function formatShortDate(value: string): string {
  return SHORT_DATE_FORMATTER.format(new Date(value));
}

const ADMIN_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Formats a date as zh-CN "YYYY/MM/DD" for admin list views. */
export function formatAdminDate(value: string): string {
  return ADMIN_DATE_FORMATTER.format(new Date(value));
}

const ADMIN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formats a timestamp as zh-CN "MM/DD HH:mm" for admin list views. */
export function formatDateTime(value: string): string {
  return ADMIN_DATE_TIME_FORMATTER.format(new Date(value));
}
