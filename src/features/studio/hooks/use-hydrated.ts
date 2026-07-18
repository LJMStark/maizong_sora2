import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns false during SSR/hydration and true after the client has hydrated.
 * Use to defer rendering of client-only UI (e.g. values read from
 * localStorage) without a manual mounted-state effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
