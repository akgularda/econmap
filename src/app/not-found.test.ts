import { describe, expect, it } from "vitest";

import { resolveCitySlugFromPath } from "@/app/not-found";

// The SPA fallback is what keeps non-pre-rendered (minor) city deep links from 404ing: the exported
// 404.html boots the app and this rule routes /city/<slug>/ to CityPageClient, which resolves ANY
// slug from the dossier bundle. These cases lock that routing rule.
describe("resolveCitySlugFromPath (SPA fallback for minor-city deep links)", () => {
  it("extracts the slug from a trailing-slash city path", () => {
    expect(resolveCitySlugFromPath("/city/geo-9999-minortown/")).toBe("geo-9999-minortown");
  });

  it("extracts the slug from a non-trailing-slash city path", () => {
    expect(resolveCitySlugFromPath("/city/geo-9999-minortown")).toBe("geo-9999-minortown");
  });

  it("decodes percent-encoded slugs", () => {
    expect(resolveCitySlugFromPath("/city/geo-1-a%20b/")).toBe("geo-1-a b");
  });

  it("returns null for non-city routes", () => {
    expect(resolveCitySlugFromPath("/country/turkey/")).toBeNull();
    expect(resolveCitySlugFromPath("/")).toBeNull();
  });

  it("rejects nested paths under /city", () => {
    expect(resolveCitySlugFromPath("/city/a/b/")).toBeNull();
  });
});
