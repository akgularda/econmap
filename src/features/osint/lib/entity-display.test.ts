import { describe, expect, it } from "vitest";

import {
  ENTITY_ICON,
  entityColor,
  entityIcon,
  entityLabel,
  fmtPop,
} from "@/features/osint/lib/entity-display";

describe("entity-display", () => {
  it("fmtPop comma-formats and handles null/undefined", () => {
    expect(fmtPop(1_234_567)).toBe("1,234,567 pop.");
    expect(fmtPop(0)).toBe("0 pop.");
    expect(fmtPop(null)).toBe("pop. unknown");
    expect(fmtPop(undefined)).toBe("pop. unknown");
  });

  it("entityLabel maps known types and falls back to the raw type", () => {
    expect(entityLabel("port")).toBe("Ports");
    expect(entityLabel("research")).toBe("Research & universities");
    expect(entityLabel("totally_unknown")).toBe("totally_unknown");
  });

  it("entityIcon returns the mapped icon and a fallback for unknown types", () => {
    expect(entityIcon("airport")).toBe(ENTITY_ICON.airport);
    // unknown → Building2 (the company icon), never undefined
    expect(entityIcon("nope")).toBe(ENTITY_ICON.company);
  });

  it("entityColor returns a hex for known and a default hex for unknown types", () => {
    expect(entityColor("utility")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(entityColor("nope")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
