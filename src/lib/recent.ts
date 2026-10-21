export interface RecentItem {
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
}

const KEY = "fyn-recent-v1";
const MAX = 8;

export function recordRecent(item: RecentItem): void {
  try {
    const list = readRecent().filter((i) => i.slug !== item.slug);
    list.unshift(item);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage unavailable — ignore
  }
}

export function readRecent(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : [];
  } catch {
    return [];
  }
}
