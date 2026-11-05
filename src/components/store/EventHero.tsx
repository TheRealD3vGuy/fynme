import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventView } from "@/lib/events";

export function EventHero({ event }: { event: EventView }) {
  const { hero } = event;
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [cycle, setCycle] = useState(0);
  const slides = hero.slides.filter(Boolean);
  const seconds = hero.slide_seconds;
  useEffect(() => {
    if (hero.media_type !== "slideshow" || slides.length < 2) return;
    const timer = setTimeout(() => { setIndex(i => (i + 1) % slides.length); setCycle(c => c + 1); }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [hero.media_type, slides.length, seconds, index, cycle]);
  const imageClass = "absolute inset-0 h-full w-full object-cover";
  return <section className="relative h-[65vh] min-h-[420px] max-h-[850px] overflow-hidden bg-secondary">
    {hero.media_type === "video" && hero.video_url ? <video className={imageClass} src={hero.video_url} poster={hero.image_url || undefined} autoPlay playsInline loop muted={muted} /> : hero.media_type === "slideshow" ? slides.map((src, i) => <img key={i} src={src} alt="" className={`${imageClass} transition-opacity duration-700 ${i === index % slides.length ? "opacity-100" : "opacity-0"}`} />) : hero.image_url && <img src={hero.image_url} alt="" className={imageClass} />}
    <div className="absolute inset-0 bg-background" style={{ opacity: hero.overlay }} />
    {hero.media_type === "video" && hero.video_url && <Button variant="outline" size="icon" title={muted ? "Unmute video" : "Mute video"} aria-label={muted ? "Unmute video" : "Mute video"} className="absolute right-4 top-4 z-10 bg-background/70" onClick={() => setMuted(m => !m)}>{muted ? <VolumeX /> : <Volume2 />}</Button>}
    {hero.media_type === "slideshow" && slides.length > 1 && <div className="absolute inset-x-4 top-4 flex gap-2">{slides.map((_, i) => <Button key={i} variant="ghost" aria-label={`Show slide ${i + 1}`} className="h-7 min-w-0 flex-1 rounded-none px-0 hover:bg-transparent" onClick={() => { setIndex(i); setCycle(c => c + 1); }}><span className="relative h-1 w-full overflow-hidden bg-foreground/30">{i < index && <span className="absolute inset-0 bg-foreground" />}{i === index && <span key={cycle} className="animate-slide-progress absolute inset-0 origin-left bg-foreground" style={{ animationDuration: `${seconds}s` }} />}</span></Button>)}</div>}
    <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-6 pb-12 text-right"><p className="mb-3 section-label text-accent">Find Your North · Private gathering</p><h1 className="text-outline font-display text-5xl font-bold uppercase leading-none sm:text-7xl md:text-8xl break-words">{event.title}</h1>{event.subtitle && <p className="mt-4 text-lg">{event.subtitle}</p>}</div>
  </section>;
}