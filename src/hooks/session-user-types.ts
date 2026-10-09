// Pure type module for `useSessionUser`. Split out so the hook
// file can `import` from it without re-evaluating the React
// context, which keeps the type surface stable for callers
// that only need the shape.

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** The user's preferred UI language — "en" or "bn". */
  language: string;
  /** The user's preferred theme — "light" or "dark". */
  theme: string;
  /** Whether the user has the "use Bangla numerals" preference on. */
  banglaNumerals: boolean;
  /** First character of the trimmed name, uppercased — used as the
   *  avatar fallback. */
  initial: string;
}

export interface UseSessionUserResult {
  status: SessionStatus;
  user: SessionUser | null;
}
