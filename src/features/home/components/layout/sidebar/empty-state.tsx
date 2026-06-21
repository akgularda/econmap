import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EmptyStateAction =
  | { kind: "link"; href: string; label: string }
  | { kind: "button"; onClick: () => void; label: string };

type EmptyStateProps = {
  icon: LucideIcon;
  headline: string;
  subtext: string;
  action?: EmptyStateAction;
  /** Renders the amber coverage-pending accent instead of the neutral empty look. */
  pending?: boolean;
};

/**
 * Intentional, branded empty / pending state: an icon, a one-line headline, a
 * one-line subtext, and an optional CTA. Replaces the v1 wall of apology cards.
 */
export function EmptyState({ icon: Icon, headline, subtext, action, pending = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border px-3 py-3 ${
        pending
          ? "border-amber-300/25 bg-amber-300/[0.04]"
          : "border-[#272c29] bg-[#0f1112]"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden
          className={`size-4 shrink-0 ${pending ? "text-amber-300/80" : "text-slate-500"}`}
        />
        <p className="text-[12px] font-semibold text-slate-200">{headline}</p>
      </div>
      <p className="text-[11px] leading-4 text-slate-500">{subtext}</p>
      {action ? (
        action.kind === "link" ? (
          <Link
            href={action.href}
            className="tactical-chip tactical-chip-active mt-0.5 w-fit px-2.5 py-1 text-[10px]"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="tactical-chip tactical-chip-active mt-0.5 w-fit px-2.5 py-1 text-[10px]"
          >
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
