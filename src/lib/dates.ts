// Mirrors CampTrack/js/ui.js date + trip-status helpers.
export function todayISO(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function fmtDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Mirrors timeAgo() in CampTrack/js/ui.js — a short relative string, falling
// back to a plain date once it's more than a week old.
export function timeAgo(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return "Never";
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  if (diffMs < 0 || isNaN(diffMs)) return "Just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(isoTimestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export type TripStatus = "active" | "upcoming" | "past";

export function tripStatus(trip: { start: string; end?: string }): TripStatus {
  const t = todayISO();
  const end = trip.end || trip.start;
  if (trip.start <= t && end >= t) return "active";
  return trip.start > t ? "upcoming" : "past";
}
