import { useEffect } from "react";

/**
 * Closes a popover/menu when the user presses Escape or pointer-downs outside
 * of it. `getElement` should return the menu's root element (usually
 * `() => ref.current`); events inside that element do not dismiss.
 */
export function useDismissableMenu(
  isOpen: boolean,
  getElement: () => HTMLElement | null,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!getElement()?.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, getElement, onDismiss]);
}
