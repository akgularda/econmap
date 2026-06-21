import Link from "next/link";

import { WORKSPACE_NAV } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function PageFrame({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.1),transparent_20%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-6 text-slate-100 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_40px_120px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">{eyebrow}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {title}
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">{description}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {WORKSPACE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className={cn("mt-6", className)}>{children}</div>
        </div>
      </div>
    </main>
  );
}
