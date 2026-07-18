// Cross-component window event names for the studio shell. Components in
// different trees (shell, workshops, dialogs) coordinate through these events
// instead of prop drilling.
export const STUDIO_OPEN_LOGIN_EVENT = "studio:open-login";
export const STUDIO_SESSIONS_CHANGED_EVENT = "studio:sessions-changed";
export const STUDIO_NEW_SESSION_EVENT = "studio:new-session";
export const STUDIO_FOCUS_COMPOSER_EVENT = "studio:focus-composer";
export const STUDIO_MODAL_OPENED_EVENT = "studio:modal-opened";
export const STUDIO_LOCAL_VIEW_CLEARED_EVENT = "studio:local-view-cleared";

export function dispatchStudioEvent(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

export function openLoginDialog() {
  dispatchStudioEvent(STUDIO_OPEN_LOGIN_EVENT);
}

export function notifySessionsChanged() {
  dispatchStudioEvent(STUDIO_SESSIONS_CHANGED_EVENT);
}
