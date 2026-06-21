"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

export type HomeViewParams = {
  searchQuery: string;
  selectedCitySlug?: string;
  requestedViewId?: string;
  requestedLayerIds: string[];
  requestedBaseImageryLayerId?: string;
  requestedDate?: string;
  /** True only on a blank homepage (no `?` params) — drives the featured-city default. */
  isBlankHomepageSearch: boolean;
};

function parseSearch(search: string): HomeViewParams {
  const params = new URLSearchParams(search);
  const layers = params.get("layers");
  const hasAnyParam =
    params.has("q") ||
    params.has("city") ||
    params.has("view") ||
    params.has("layers") ||
    params.has("base") ||
    params.has("date");

  return {
    searchQuery: params.get("q") ?? "",
    selectedCitySlug: params.get("city") ?? undefined,
    requestedViewId: params.get("view") ?? undefined,
    requestedLayerIds: layers ? layers.split(",").filter(Boolean) : [],
    requestedBaseImageryLayerId: params.get("base") ?? undefined,
    requestedDate: params.get("date") ?? undefined,
    isBlankHomepageSearch: !hasAnyParam,
  };
}

/**
 * Subscribe to URL changes. We listen for `popstate` (back/forward) and for our
 * own `pushState` (re-broadcast as a synthetic `home-view-nav` event) so the
 * external-store snapshot tracks the live querystring.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("home-view-nav", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("home-view-nav", onStoreChange);
  };
}

function getSnapshot(): string {
  return window.location.search;
}

/**
 * Client reader/writer for the home view's `?q/?city/?layers/?base/?date/?view`
 * URL vocabulary. Reads the live `location.search` via `useSyncExternalStore`
 * (so React stays in sync with back/forward and our own pushState without
 * effect-driven setState), seeded by the server-rendered `initial` snapshot for
 * the first paint. `navigate` writes the next querystring via `history.pushState`.
 *
 * This is the only justified piece of new plumbing: it does NOT add a store and
 * does NOT introduce a parallel source of truth — it reads and writes the same
 * `hrefFor` URL vocabulary that the `<Link>`-based fallback already uses.
 */
export function useHomeViewParams(initial: HomeViewParams): {
  params: HomeViewParams;
  navigate: (href: string) => void;
} {
  // Server/hydration snapshot: the static export hardcodes blank params, so
  // reconstruct the querystring the server resolved from so the first client
  // snapshot matches before useSyncExternalStore reads the real URL.
  const serverSnapshotRef = useRef<string | null>(null);
  if (serverSnapshotRef.current === null) {
    const params = new URLSearchParams();
    if (initial.searchQuery) params.set("q", initial.searchQuery);
    if (initial.selectedCitySlug) params.set("city", initial.selectedCitySlug);
    if (initial.requestedViewId) params.set("view", initial.requestedViewId);
    if (initial.requestedLayerIds.length > 0) params.set("layers", initial.requestedLayerIds.join(","));
    if (initial.requestedBaseImageryLayerId) params.set("base", initial.requestedBaseImageryLayerId);
    if (initial.requestedDate) params.set("date", initial.requestedDate);
    const query = params.toString();
    serverSnapshotRef.current = query ? `?${query}` : "";
  }

  const getServerSnapshot = useCallback(() => serverSnapshotRef.current as string, []);
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = useMemo(() => parseSearch(search), [search]);

  const navigate = useCallback((href: string) => {
    // Only handle home-relative deep links ("/" or "/?..."); anything else is a
    // real route the caller should navigate to normally.
    const [pathname, nextSearch = ""] = href.split("?");
    const normalizedPath = pathname.replace(/\/+$/, "") || "/";
    if (normalizedPath !== "/") {
      return;
    }
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    window.history.pushState(null, "", nextUrl);
    window.dispatchEvent(new Event("home-view-nav"));
  }, []);

  return { params, navigate };
}
