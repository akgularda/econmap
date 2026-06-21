import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useHomeViewParams, type HomeViewParams } from "@/features/home/lib/use-home-view-params";

const INITIAL: HomeViewParams = {
  searchQuery: "",
  selectedCitySlug: undefined,
  requestedViewId: "global-ops",
  requestedLayerIds: ["ports"],
  requestedBaseImageryLayerId: "night-lights",
  requestedDate: "2016-01-01",
  isBlankHomepageSearch: true,
};

afterEach(() => {
  window.history.pushState(null, "", "/");
});

describe("useHomeViewParams", () => {
  it("adopts the live querystring on mount", () => {
    window.history.pushState(null, "", "/?city=geo-2-ankara&layers=airports,ports&q=ank");
    const { result } = renderHook(() => useHomeViewParams(INITIAL));
    expect(result.current.params.selectedCitySlug).toBe("geo-2-ankara");
    expect(result.current.params.requestedLayerIds).toEqual(["airports", "ports"]);
    expect(result.current.params.searchQuery).toBe("ank");
    expect(result.current.params.isBlankHomepageSearch).toBe(false);
  });

  it("treats a param-less URL as a blank homepage", () => {
    window.history.pushState(null, "", "/");
    const { result } = renderHook(() => useHomeViewParams(INITIAL));
    expect(result.current.params.isBlankHomepageSearch).toBe(true);
    expect(result.current.params.requestedLayerIds).toEqual([]);
  });

  it("navigate() pushes state without reload and updates params", () => {
    const { result } = renderHook(() => useHomeViewParams(INITIAL));
    act(() => {
      result.current.navigate("/?layers=airports&base=night-lights");
    });
    expect(window.location.search).toBe("?layers=airports&base=night-lights");
    expect(result.current.params.requestedLayerIds).toEqual(["airports"]);
    expect(result.current.params.requestedBaseImageryLayerId).toBe("night-lights");
  });

  it("navigate() ignores non-home routes (leaves them to normal navigation)", () => {
    window.history.pushState(null, "", "/?city=geo-1");
    const { result } = renderHook(() => useHomeViewParams(INITIAL));
    act(() => {
      result.current.navigate("/compare");
    });
    // URL unchanged — the route link is handled by the normal navigation path.
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?city=geo-1");
  });
});
