import { useQuery } from "@tanstack/react-query";
import { fetchSetting } from "@/lib/store";

export type NewsBarSettings = {
  enabled?: boolean;
  items?: string[];
  link?: string;
  speed?: number; // seconds for one full loop
  color?: "terracotta" | "forest" | "gold" | "dark";
  direction?: "left" | "right";
  pause_on_hover?: boolean;
  uppercase?: boolean;
};

const COLORS: Record<string, string> = {
  terracotta: "bg-terracotta text-accent-foreground",
  forest: "bg-forest text-foreground",
  gold: "bg-gold text-background",
  dark: "bg-card text-foreground",
};

export function NewsBar() {
  const { data } = useQuery({
    queryKey: ["setting", "announcement"],
    queryFn: () => fetchSetting<NewsBarSettings>("announcement"),
  });
  const items = (data?.items ?? []).map((s) => s.trim()).filter(Boolean);
  if (!data?.enabled || items.length === 0) return null;

  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6">{t}</span>
          <span aria-hidden>✦</span>
        </span>
      ))}
    </div>
  );
  const track = (
    <div
      className={`animate-news-marquee flex w-max ${data.pause_on_hover !== false ? "group-hover:[animation-play-state:paused]" : ""}`}
      style={{
        animationDuration: `${Math.max(5, data.speed ?? 30)}s`,
        animationDirection: data.direction === "right" ? "reverse" : "normal",
      }}
    >
      {row}
      {row}
    </div>
  );

  return (
    <div
      role="marquee"
      aria-label={items.join(" — ")}
      className={`group overflow-hidden whitespace-nowrap py-2 text-xs font-semibold tracking-wider ${data.uppercase !== false ? "uppercase" : ""} ${COLORS[data.color ?? "terracotta"]}`}
    >
      {data.link ? <a href={data.link} className="block">{track}</a> : track}
    </div>
  );
}
