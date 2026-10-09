// PageHeader — the single source of truth for the page-level title
// block on every logged-in page.
//
// Layout:
//   <eyebrow>      optional small overline (e.g. "Sunday, 4 Oct 2026")
//   <h1>title</h1> 32px desktop / 28px mobile, semibold, -0.02em
//   <subtitle>     optional 15px / 14px muted line under the title
//   <action>       optional right-aligned CTA row (Add loan, etc.)
//
// The component is a "header" element so it shows up in the page's
// accessibility tree as the top-level landmark. The H1 inside is
// styled via the `text-h1` token (which auto-steps down on mobile
// via the @media block in globals.css), so the H1 looks identical
// on every page it appears on.

import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Optional eyebrow text (e.g. "Sunday, 4 Oct 2026"). */
  eyebrow?: ReactNode;
  /** The H1. Required. */
  title: ReactNode;
  /** Optional one-liner under the title. */
  subtitle?: ReactNode;
  /** Optional right-aligned action row (CTA button, link, etc.). */
  action?: ReactNode;
  /** When true, hide the eyebrow on small screens (some pages only
   *  show it on md+). Default: false. */
  eyebrowMdUpOnly?: boolean;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  eyebrowMdUpOnly = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={[
        "flex w-full min-w-0 flex-col gap-2",
        // On lg+ the title row + action row sit side-by-side.
        "lg:flex-row lg:items-end lg:justify-between lg:gap-4",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {eyebrow != null ? (
          <p className={eyebrowMdUpOnly ? "eyebrow hidden md:block" : "eyebrow"}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-h1 font-semibold text-text">{title}</h1>
        {subtitle != null ? (
          <p className="text-subtitle font-normal text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action != null ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          {action}
        </div>
      ) : null}
    </header>
  );
}
