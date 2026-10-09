import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Sans, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getT, readServerLang } from "@/lib/i18n/server";
import { dictionary } from "@/lib/i18n";
import { auth } from "@/server/auth";

// The root layout reads the language cookie (`readServerLang()` calls
// `cookies()`) which makes it dynamic. We can't use the
// `dynamic = "force-dynamic"` segment config because it's not
// compatible with `cacheComponents`. Instead, we wrap the
// cookie-reading subtree in <Suspense> and skip the prerender for
// not-found by giving the not-found page its own segment that
// doesn't need cookies.
export const dynamic = "force-dynamic";

// Single UI font for the whole app — DM Sans. Weights 400, 500, 600.
// Loaded via next/font/google with the latin subset and `display: swap`
// so text is painted with the system fallback while DM Sans loads, and
// never causes a layout shift on swap.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Bangla fallback — Noto Sans Bengali covers the ৳ glyph and the
// Bangla script. We load weights 400, 500, 600, 700 to match DM Sans'
// style axis. The browser falls back to it only for glyphs DM Sans
// cannot render.
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Root metadata — translated at the server with the user's language
 * cookie. The fallback is the English dictionary so SSR with no
 * cookie still produces sensible page titles and og descriptions.
 */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await readServerLang();
  const dict = dictionary(lang);
  const tagline = dict["common.tagline"];
  return {
    title: dict["common.appName"],
    description: tagline,
  };
}

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  // Resolve the language cookie and the session in parallel. The
  // language cookie is read at the top so <html lang> matches the
  // user's preference on first paint (no flash of English for a
  // Bangla user). The session is then passed to <Providers> so
  // the client-side SessionProvider has the user available
  // immediately and the navbar / profile menu render the real
  // name on the first render — no "Sign in" flash for a signed-in
  // user. Both calls are server-side; the JWT verification
  // happens in the same request that rendered the layout.
  const [lang, session] = await Promise.all([readServerLang(), auth()]);
  const t = await getT();
  return (
    <html
      lang={lang}
      className={[
        dmSans.variable,
        notoBengali.variable,
        "h-full antialiased",
      ].join(" ")}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the persisted theme before paint to avoid a flash.
         *  The language is already set on <html> server-side, so this
         *  script only needs to keep the theme in sync. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('loan-reminder:theme');if(t==='dark'||t==='light'){document.documentElement.classList.toggle('dark',t==='dark');}}catch(e){}})();",
          }}
        />
        <meta name="application-name" content={t("common.appName")} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        {/* Wrapping the children in <Suspense> lets Next 16 stream the
         *  language-aware markup. The `readServerLang()` call above
         *  (which reads the language cookie via `cookies()`) is
         *  therefore allowed to suspend; without this boundary the
         *  blocking-prerender check refuses to prerender the root
         *  layout and the static `/_not-found` page. */}
        <Suspense fallback={null}>
          <Providers initialLang={lang} session={session}>
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
