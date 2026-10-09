// Auth.js (NextAuth v5) configuration.
//
// Strategy
// --------
//   * Session strategy: `jwt`.
//     Auth.js v5 documents that the Credentials provider requires JWT
//     sessions — the `database` session strategy only supports OAuth
//     providers (no credentials). The Prisma adapter is still used
//     for the user / account / session tables (OAuth), and as a
//     convenient handle to read the user row inside the JWT callback.
//   * Two providers:
//       1. Credentials — email + password. Passwords are hashed with
//          `bcryptjs` (cost 12). On success the `authorize` callback
//          returns the user row.
//       2. Google OAuth — only registered when BOTH `AUTH_GOOGLE_ID`
//          and `AUTH_GOOGLE_SECRET` are set. The login page also
//          hides the "Continue with Google" button when either is
//          empty, so the UI never offers an option the server
//          refuses to honour.
//   * Session shape — `{ user: { id, email, name, image, language,
//     theme, banglaNumerals, tokenVersion } }`. The
//     `tokenVersion` field lets us invalidate every other device the
//     user is logged into the moment their password changes (the
//     `jwt` callback rejects tokens whose `tokenVersion` lags
//     behind the database row).
//   * Cookies — httpOnly, sameSite=lax, secure in production. The
//     `cookies` config below takes precedence over the library
//     defaults so we don't accidentally emit non-httpOnly cookies
//     from a future migration.
//
// We never log, print or surface any of the env values we read
// below.

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

/* ---- Config --------------------------------------------------------- */

const isProd = process.env.NODE_ENV === "production";

const googleId = process.env.AUTH_GOOGLE_ID?.trim();
const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
export const googleEnabled = Boolean(googleId && googleSecret);

/** Zod schema for the credentials payload. We trim and lowercase
 *  the email before validation so the lookup matches what the
 *  user typed. The hash comparison happens in `authorize` itself. */
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/* ---- The config object ---------------------------------------------- */

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  // JWT sessions — see "Strategy" at the top of this file for why.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        // Validate the payload with zod. Returning `null` here
        // makes Auth.js show the same generic "CredentialsSignin"
        // error to the UI, so we don't leak whether the email
        // exists.
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          // Still run a bcrypt compare to keep the missing-user and
          // wrong-password timings similar — this avoids the
          // "email exists / not" side-channel.
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
        };
      },
    }),
    // Google is only added when both env vars are present so the
    // library never receives a half-configured provider. The login
    // page also hides its button in that case.
    ...(googleEnabled
      ? [
          Google({
            clientId: googleId!,
            clientSecret: googleSecret!,
            // We require an `email` scope (the default) and add
            // `profile` so we can store the avatar URL on the user.
            authorization: { params: { scope: "openid email profile" } },
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * Stamps the `tokenVersion` (and a couple of UI preferences) onto
     * the JWT so the session callback can return them and the
     * `session` check below can invalidate stale tokens.
     */
    async jwt({ token, user }) {
      // First sign-in (`user` is the row from `authorize` or the
      // adapter). Seed the token with the user's id so the very
      // first re-read below can find the row.
      if (user) {
        token.userId = (user as { id: string }).id;
      }

      // Refresh on every call. The token is small so this is cheap,
      // and it lets the UI pick up language / theme changes without
      // a sign-out. `update()` triggers a re-run as well; we don't
      // need a special branch.
      const userId =
        (token.userId as string | undefined) ??
        (token.sub as string | undefined);
      if (userId) {
        const row = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            language: true,
            theme: true,
            banglaNumerals: true,
            tokenVersion: true,
          },
        });
        if (!row) {
          // User was deleted between requests. Drop the token.
          return null as unknown as typeof token;
        }
        // Stale-token guard. If the user changed their password
        // (or signed out everywhere) we bumped `tokenVersion` in
        // the DB; the JWT still has the old value, so reject it.
        if (
          typeof token.tokenVersion === "number" &&
          row.tokenVersion !== token.tokenVersion
        ) {
          return null as unknown as typeof token;
        }
        token.userId = row.id;
        token.email = row.email;
        token.name = row.name;
        token.picture = row.image ?? undefined;
        token.language = row.language;
        token.theme = row.theme;
        token.banglaNumerals = row.banglaNumerals;
        token.tokenVersion = row.tokenVersion;
      }
      return token;
    },
    /**
     * Shapes the session object the rest of the app sees. We expose
     * only the fields the UI needs and keep the JWT's full payload
     * server-side.
     */
    async session({ session, token }) {
      if (token?.userId) {
        session.user = {
          ...session.user,
          id: token.userId as string,
          email:
            (token.email as string | undefined) ??
            session.user?.email ??
            null,
          name:
            (token.name as string | undefined) ??
            session.user?.name ??
            null,
          image:
            (token.picture as string | undefined) ??
            session.user?.image ??
            null,
          language: (token.language as string | undefined) ?? "en",
          theme: (token.theme as string | undefined) ?? "light",
          banglaNumerals: Boolean(token.banglaNumerals),
          tokenVersion: (token.tokenVersion as number | undefined) ?? 0,
        } as typeof session.user;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: isProd
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  // Auth.js v5 emits a lot of console output by default; keep dev
  // quiet unless the developer opts in.
  debug: false,
};

/** A throwaway bcrypt hash used to make the missing-user code path
 *  take roughly the same time as a real compare. Generated once
 *  with `bcrypt.hashSync("not-a-real-password", 12)`. */
const DUMMY_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8pP4rVQ0iCkSxd4YfG2V4YoC5KzU2K";

/* ---- Exports -------------------------------------------------------- */

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
