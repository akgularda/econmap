export type StatusBadgeKind = "mapped" | "documented" | "coverage-pending" | "missing";

/**
 * Single source of truth for the status badge palette used across the rail.
 * `mapped` (sage), `documented` (sky), `coverage-pending` (amber, distinct from
 * `missing` gray). Reused everywhere instead of re-deriving per component.
 */
export function getStatusBadge(kind: StatusBadgeKind): { className: string; label: string } {
  switch (kind) {
    case "mapped":
      return { className: "status-mapped", label: "mapped" };
    case "documented":
      return { className: "status-documented", label: "documented" };
    case "coverage-pending":
      return { className: "coverage-pending", label: "coverage pending" };
    default:
      return { className: "status-missing", label: "missing" };
  }
}
