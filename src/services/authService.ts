// Authentication service.
//
// When `NEXT_PUBLIC_API_URL` is set the functions below call the real
// auth endpoints. When it's empty they fall back to a localStorage
// stand-in (so the prototype keeps working without a server).
//
// All exports are `async` so the call sites never branch on which
// backend is configured. SSR-safe: nothing here touches `window` at
// module scope; the storage helpers check `hasWindow()` themselves.

import { API_ENABLED, apiPost } from "@/lib/api";
import { clearAuthToken, setAuthToken } from "@/lib/auth";

/** What the rest of the app sees as a logged-in user. */
export interface AuthUser {
  /** Stable user id returned by the backend. */
  id: string;
  name?: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

/* ---- localStorage fallback ------------------------------------------- */

const SESSION_KEY = "loan-reminder:auth:v1";
const CHANGE_EVENT = "auth:change";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readSession(): AuthUser | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.email) return null;
    return {
      id: parsed.id ?? parsed.email,
      email: parsed.email,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}

function writeSession(user: AuthUser | null): void {
  if (!hasWindow()) return;
  if (user) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/* ---- Public API ------------------------------------------------------ */

/**
 * Returns the current session, or `null` when signed out. SSR-safe —
 * always returns `null` on the server.
 */
export async function getSession(): Promise<AuthUser | null> {
  return readSession();
}

/** Returns `true` when a session exists. */
export async function isAuthenticated(): Promise<boolean> {
  return readSession() !== null;
}

/** Mock sign-in. */
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  if (API_ENABLED) {
    const res = await apiPost<AuthResponse>("/auth/login", input);
    setAuthToken(res.token);
    writeSession(res.user);
    return res.user;
  }
  if (!input.email || !input.password) {
    throw new Error("Email and password are required.");
  }
  if (input.password.length < 6) {
    throw new Error("Incorrect password");
  }
  const user: AuthUser = { id: input.email, email: input.email };
  writeSession(user);
  return user;
}

/** Mock sign-up. */
export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  if (API_ENABLED) {
    const res = await apiPost<AuthResponse>("/auth/register", input);
    setAuthToken(res.token);
    writeSession(res.user);
    return res.user;
  }
  if (!input.name || !input.email || !input.password) {
    throw new Error("Name, email, and password are required.");
  }
  if (input.password.length < 8) {
    throw new Error("Use at least 8 characters.");
  }
  const user: AuthUser = {
    id: input.email,
    email: input.email,
    name: input.name,
  };
  writeSession(user);
  return user;
}

/** Signs the user out — clears the token store and the cached session. */
export async function signOut(): Promise<void> {
  clearAuthToken();
  writeSession(null);
}

/**
 * Subscribe to session changes (in-tab + cross-tab). Returns an
 * unsubscribe function. SSR-safe — always returns a no-op on the server.
 */
export function onAuthChange(handler: () => void): () => void {
  if (!hasWindow()) return () => {};
  const listener = () => handler();
  window.addEventListener(CHANGE_EVENT, listener);
  const storageListener = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) handler();
  };
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}

/* ---- Password recovery ------------------------------------------------- */

/**
 * Mock "forgot password" — sends a one-time reset link to the given
 * email. The real backend will validate the email exists before
 * returning 200; the prototype just acknowledges the intent.
 */
export async function forgotPassword(input: {
  email: string;
}): Promise<{ ok: true; email: string }> {
  if (API_ENABLED) {
    const res = await apiPost<{ ok: true; email: string }>(
      "/auth/forgot-password",
      input,
    );
    return res;
  }
  if (!input.email) {
    throw new Error("Enter your email.");
  }
  return { ok: true, email: input.email };
}

/**
 * Mock "reset password" — accepts a token + new password pair. The
 * prototype doesn't actually verify the token; the real backend will.
 */
export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  if (API_ENABLED) {
    await apiPost<{ ok: true }>("/auth/reset-password", input);
    return { ok: true };
  }
  if (!input.token) {
    throw new Error("Reset token is missing.");
  }
  if (input.newPassword.length < 8) {
    throw new Error("Use at least 8 characters.");
  }
  return { ok: true };
}