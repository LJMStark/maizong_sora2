"use client";

export const STUDIO_HISTORY_ENABLED_KEY = "studio:history-enabled";
export const STUDIO_NOTIFICATIONS_ENABLED_KEY = "studio:notifications-enabled";
export const STUDIO_APPEARANCE_KEY = "studio:appearance";
export const STUDIO_LANGUAGE_KEY = "studio:language";
export const STUDIO_PREFERENCES_CHANGED_EVENT = "studio:preferences-changed";

export type StudioAppearancePreference = "system" | "light" | "dark";
export type StudioLanguagePreference = "auto" | "zh-CN";

interface StudioPreferenceChangeDetail {
  key: string;
  value: string;
}

export function readBooleanPreference(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null) return fallback;
    return storedValue !== "false";
  } catch {
    return fallback;
  }
}

export function writeBooleanPreference(key: string, value: boolean) {
  if (typeof window === "undefined") return;

  const serializedValue = value ? "true" : "false";

  try {
    window.localStorage.setItem(key, serializedValue);
  } catch {
    // The visible UI still updates even if browser storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<StudioPreferenceChangeDetail>(
      STUDIO_PREFERENCES_CHANGED_EVENT,
      {
        detail: {
          key,
          value: serializedValue,
        },
      }
    )
  );
}

export function getBooleanPreferenceFromEvent(
  event: Event,
  key: string
) {
  const detail = (event as CustomEvent<StudioPreferenceChangeDetail>).detail;
  if (!detail || detail.key !== key) return null;
  return detail.value !== "false";
}

export function isStudioAppearancePreference(
  value: string | null
): value is StudioAppearancePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveStudioAppearance(
  value: StudioAppearancePreference
): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (value === "light" || value === "dark") return value;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyStudioAppearance(value: StudioAppearancePreference) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const resolvedAppearance = resolveStudioAppearance(value);
  const useDark = resolvedAppearance === "dark";

  root.classList.toggle("dark", useDark);
  root.classList.toggle("studio-dark", useDark);
  root.dataset.studioAppearancePreference = value;
  root.dataset.studioAppearance = resolvedAppearance;
}

export function readAppearancePreference(
  fallback: StudioAppearancePreference = "system"
) {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(STUDIO_APPEARANCE_KEY);
    return isStudioAppearancePreference(storedValue) ? storedValue : fallback;
  } catch {
    return fallback;
  }
}

export function writeAppearancePreference(value: StudioAppearancePreference) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STUDIO_APPEARANCE_KEY, value);
  } catch {
    // The visible UI still updates even if browser storage is unavailable.
  }

  applyStudioAppearance(value);
  window.dispatchEvent(
    new CustomEvent<StudioPreferenceChangeDetail>(
      STUDIO_PREFERENCES_CHANGED_EVENT,
      {
        detail: {
          key: STUDIO_APPEARANCE_KEY,
          value,
        },
      }
    )
  );
}

export function getAppearancePreferenceFromEvent(event: Event) {
  const detail = (event as CustomEvent<StudioPreferenceChangeDetail>).detail;
  if (!detail || detail.key !== STUDIO_APPEARANCE_KEY) return null;
  return isStudioAppearancePreference(detail.value) ? detail.value : null;
}

export function isStudioLanguagePreference(
  value: string | null
): value is StudioLanguagePreference {
  return value === "auto" || value === "zh-CN";
}

export function readLanguagePreference(
  fallback: StudioLanguagePreference = "auto"
) {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(STUDIO_LANGUAGE_KEY);
    return isStudioLanguagePreference(storedValue) ? storedValue : fallback;
  } catch {
    return fallback;
  }
}

export function writeLanguagePreference(value: StudioLanguagePreference) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STUDIO_LANGUAGE_KEY, value);
  } catch {
    // The visible UI still updates even if browser storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<StudioPreferenceChangeDetail>(
      STUDIO_PREFERENCES_CHANGED_EVENT,
      {
        detail: {
          key: STUDIO_LANGUAGE_KEY,
          value,
        },
      }
    )
  );
}

export function getLanguagePreferenceFromEvent(event: Event) {
  const detail = (event as CustomEvent<StudioPreferenceChangeDetail>).detail;
  if (!detail || detail.key !== STUDIO_LANGUAGE_KEY) return null;
  return isStudioLanguagePreference(detail.value) ? detail.value : null;
}
