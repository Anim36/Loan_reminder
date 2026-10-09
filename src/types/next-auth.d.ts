// Module augmentation for `next-auth/react`.
//
// The v5 beta's `next-auth/react` runtime exports a `SessionContext`
// (the React Context object used by both `SessionProvider` and
// `useSession`) but the bundled `.d.ts` doesn't declare it. We
// re-declare it here so our `useSessionUser` hook can read the
// context directly and degrade gracefully when no provider is in
// the tree (e.g. on the marketing landing page).
//
// We declare the value type as a discriminated union matching the
// shape documented in `react.d.ts` (overload form of
// `SessionContextValue`): one branch for authenticated with a
// Session, one branch for unauthenticated/loading with `null`.

import type { Session } from "next-auth";

declare module "next-auth/react" {
  type _SessionContextValue =
    | {
        data: Session;
        status: "authenticated";
        update: (...args: unknown[]) => unknown;
      }
    | {
        data: null;
        status: "unauthenticated" | "loading";
        update: (...args: unknown[]) => unknown;
      };
  export const SessionContext: import("react").Context<
    _SessionContextValue | undefined
  >;
}
