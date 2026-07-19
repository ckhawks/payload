// Shared, framework-agnostic helpers for file requests ("drops"). Kept free of
// server-only imports so the create form (a client component) can reuse the
// duration presets and status labels.

export const REQUEST_DURATIONS = [
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "6h", label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  { value: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { value: "3d", label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

export type RequestStatus = "open" | "expired" | "closed" | "full";

type StatusInput = {
  expiresAt: Date;
  closedAt: Date | null;
  maxUploads: number | null;
  uploadCount: number;
  maxBytes: number | null;
  receivedBytes: number;
};

/** Resolve a request's live status. Enforced lazily; there is no sweeper. */
export function requestStatus(
  row: StatusInput,
  now: number = Date.now(),
): RequestStatus {
  if (row.closedAt) return "closed";
  if (row.expiresAt.getTime() <= now) return "expired";
  if (row.maxUploads != null && row.uploadCount >= row.maxUploads) return "full";
  if (row.maxBytes != null && row.receivedBytes >= row.maxBytes) return "full";
  return "open";
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  open: "open",
  expired: "expired",
  closed: "closed",
  full: "full",
};
