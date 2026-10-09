"use client";

/**
 * Compact language switcher used in the top bar (both desktop and
 * mobile) and the landing nav. Two variants:
 *
 *   - `"segmented"` (default for the top bar): a tiny inline toggle
 *     showing both codes side by side. "EN | বাং". No popover, no
 *     keyboard popover trap — just two buttons, each its own a11y
 *     focus target.
 *   - `"dropdown"`: the original pill + menu (used in the landing
 *     nav where there's more horizontal space).
 *
 * Both variants bind to the existing `useT()` LanguageProvider, so
 * localStorage + cookie persistence and the SSR-safe pre-paint script
 * continue to apply.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n";

const LABELS: Record<Lang, string> = {
  en: "English",
  bn: "বাংলা",
};

const SHORT: Record<Lang, string> = {
  en: "EN",
  bn: "বাং",
};

export function LanguageSwitcher({
  variant = "segmented",
}: {
  variant?: "segmented" | "dropdown" | "compact";
}) {
  const { lang, setLang } = useT();

  if (variant === "segmented") {
    return <SegmentedSwitch lang={lang} onChange={setLang} />;
  }
  if (variant === "compact") {
    return <CompactSwitch lang={lang} onChange={setLang} />;
  }
  return <DropdownSwitch lang={lang} onChange={setLang} />;
}

/* ---------------------------------------------------------------------------
 * Segmented control — used in the top bar.
 *
 * Single rounded-pill container with two equal-width buttons. The
 * active button is brand-coloured. Both buttons keep a 32px hit area
 * at minimum, with 40px tap targets on mobile.
 * ------------------------------------------------------------------------- */

function SegmentedSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
}) {
  const { t } = useT();
  return (
    <div
      role="group"
      aria-label={t["nav.language"]}
      className="flex h-9 shrink-0 items-center rounded-pill border border-border bg-surface p-0.5"
    >
      {(["en", "bn"] as Lang[]).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            aria-label={LABELS[code]}
            onClick={() => onChange(code)}
            className={[
              "inline-flex h-8 min-w-[40px] items-center justify-center rounded-pill px-2.5 text-helper font-semibold transition-colors",
              active
                ? "bg-brand-50 text-brand-600"
                : "text-muted hover:text-text",
            ].join(" ")}
          >
            {SHORT[code]}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Compact single-button — used on very narrow viewports (e.g. <390px)
 * where the segmented control is too wide to share a row with the
 * other top-bar icons. The button shows the active language's short
 * code and toggles to the other one on click. The aria-label is
 * translated so screen readers know what activating it does.
 * ------------------------------------------------------------------------- */

function CompactSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
}) {
  const { t } = useT();
  const next: Lang = lang === "en" ? "bn" : "en";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={t["nav.language"]}
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-helper font-semibold text-muted transition-colors hover:bg-neutral-50 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      {SHORT[lang]}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Dropdown — used in the landing nav where there's more horizontal space
 * ------------------------------------------------------------------------- */

function DropdownSwitch({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { t } = useT();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t["nav.language"]}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-helper font-semibold text-text hover:border-brand-600 hover:text-brand-600"
      >
        <Globe className="size-4" aria-hidden />
        {LABELS[lang]}
        <ChevronDown className="size-3" aria-hidden />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-input border border-border bg-surface shadow-overlay"
        >
          {(["en", "bn"] as Lang[]).map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={lang === l}
                onClick={() => {
                  onChange(l);
                  setOpen(false);
                }}
                className={[
                  "block w-full px-4 py-2 text-left text-helper font-medium",
                  lang === l
                    ? "bg-brand-50 text-brand-600"
                    : "text-text hover:bg-brand-50 hover:text-brand-600",
                ].join(" ")}
              >
                {LABELS[l]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
