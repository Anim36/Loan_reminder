// Auth token store.
//
// The token is the credential the `@/lib/api` wrapper attaches to every
// request as `Authorization: Bearer <token>`. It is kept in localStorage
// (browser-only) so the page survives reloads; on the server it is
// always `null` and the `api` wrapper simply omits the header.
//
// `authService.signIn` writes the token returned by the API. `signOut`
// clears it. Subscribers (the `useAuth`-style hooks) listen to the
// `auth:change` CustomEvent to stay in sync across components and tabs.

const TOKEN_KEY = "loan-reminder:auth-token:v1";
const CHANGE_EVENT = "auth:change";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** Returns the current token, or `null` when signed out / on the server. */
export function getAuthToken(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Persist the token and notify subscribers. */
export function setAuthToken(token: string): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { token } }));
}

/** Remove the token and notify subscribers. */
export function clearAuthToken(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { token: null } }));
}

/**
 * Subscribe to auth-token changes. The handler fires for both in-tab
 * changes (`setAuthToken` / `clearAuthToken`) and cross-tab changes
 * (the browser's `storage` event). Returns an unsubscribe function.
 */
export function onAuthTokenChange(handler: () => void): () => void {
  if (!hasWindow()) return () => {};
  const listener = () => handler();
  window.addEventListener(CHANGE_EVENT, listener);
  const storageListener = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) handler();
  };
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}
