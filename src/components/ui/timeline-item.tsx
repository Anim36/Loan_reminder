"use client";

/**
 * Figma reference: Loan Reminder · UI library (10:6506)
 * Timeline item, nodes 10:6869 Completed / 10:6875 Current / 10:6881 Upcoming
 *   Milestone: 28px circle, 1px border
 *   Completed: bg-brand-50 + #e8e6e1 border + check
 *   Current: bg-brand-50 + brand-600 border + bell
 *   Upcoming: bg-neutral-50 + #e8e6e1 border + circle dot
 */

import { Check, Bell, Circle } from "lucide-react";

export type TimelineState = "Completed" | "Current" | "Upcoming";

export interface TimelineItemProps {
  state: TimelineState;
  title: string;
  description: string;
  className?: string;
}

function Milestone({ state }: { state: TimelineState }) {
  const ring =
    state === "Upcoming"
      ? "bg-neutral-50 border-border"
      : state === "Current"
        ? "bg-brand-50 border-brand-600"
        : "bg-brand-50 border-border";
  return (
    <span
      className={[
        "size-[28px] rounded-pill border flex items-center justify-center shrink-0",
        ring,
      ].join(" ")}
      aria-hidden
    >
      {state === "Completed" ? (
        <Check size={14} className="text-brand-600" strokeWidth={3} />
      ) : state === "Current" ? (
        <Bell size={14} className="text-brand-600" />
      ) : (
        <Circle size={14} className="text-muted" />
      )}
    </span>
  );
}

export function TimelineItem({
  state,
  title,
  description,
  className = "",
}: TimelineItemProps) {
  const isCurrent = state === "Current";
  return (
    <div
      className={["flex items-start gap-[14px]", className].join(" ")}
      data-state={state}
    >
      <Milestone state={state} />
      <div className="flex flex-1 min-w-0 flex-col gap-1 leading-[1.5]">
        <p
          className={[
            "tabular text-label text-text w-full",
            isCurrent ? "font-semibold" : "font-medium",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="font-normal text-helper text-muted">{description}</p>
      </div>
    </div>
  );
}