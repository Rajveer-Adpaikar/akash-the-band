import { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

const REELS = [
  '1208158925',
  '1208158917',
  '1208158916',
  '1208158881',
  '1208158886',
  '1208158884',
  '1208158883',
];

const NUM_REALS = REELS.length;         // 7
const CLONE_LAST = 0;
const FIRST_REAL = 1;
const LAST_REAL = NUM_REALS;            // 7
const CLONE_FIRST = NUM_REALS + 1;      // 8

export default function ReelsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef<Map<string, any>>(new Map());
  const activeIdRef = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const slotRef = useRef(FIRST_REAL);
  const transitioningRef = useRef(false);
  const touchStartX = useRef(0);
  const [muted, setMuted] = useState(true);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());

  // ── Slot data ──────────────────────────────────────────────
  const getSlots = useCallback(() => {
    const slots: { id: string; key: string }[] = [];
    slots.push({ id: REELS[NUM_REALS - 1], key: `${REELS[NUM_REALS - 1]}-clone-end` });
    for (let i = 0; i < NUM_REALS; i++) slots.push({ id: REELS[i], key: REELS[i] });
    slots.push({ id: REELS[0], key: `${REELS[0]}-clone-start` });
    return slots;
  }, []);

  // ── Player init ────────────────────────────────────────────
  const initOne = useCallback((el: Element) => {
    const players = playersRef.current;
    const key = el.getAttribute('data-player-key');
    if (!key || players.has(key)) return;
    const id = el.getAttribute('data-reel-id');
    if (!id) return;
    const iframe = el.querySelector<HTMLIFrameElement>('iframe');
    if (!iframe || iframe.src.includes('vimeo.com')) return;

    iframe.src = `https://player.vimeo.com/video/${id}?badge=0&autopause=0&player_id=0&app_id=58479&muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&background=1`;
    const player = new (window as any).Vimeo.Player(iframe);
    player.ready().then(() => {
      players.set(key, player);
      setReadyIds((prev) => new Set(prev).add(key));
      player.setVolume(0).then(() => player.pause());
      if (id === '1208158886') player.setCurrentTime(1);
    });
  }, []);

  // Lazy init: first 2 immediately, rest on section intersect
  useEffect(() => {
    const cards = scrollRef.current?.querySelectorAll('[data-player-key]');
    cards?.forEach((el, i) => { if (i < 2) initOne(el); });

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cards?.forEach((el, i) => { if (i >= 2) initOne(el); });
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [initOne]);

  // ── Programmatic scroll (no free-scroll) ──────────────────
  const goToSlot = useCallback((slot: number, behavior: ScrollBehavior) => {
    const sw = scrollRef.current;
    if (!sw) return;
    const cards = sw.querySelectorAll<HTMLElement>('[data-player-key]');
    const target = cards[slot] as HTMLElement | undefined;
    if (!target) return;
    const swW = sw.offsetWidth;
    const targetCx = target.offsetLeft + target.offsetWidth / 2;
    sw.scrollTo({ left: targetCx - swW / 2, behavior });
  }, []);

  // ── Navigation ─────────────────────────────────────────────
  const activateByDelta = useCallback((dir: 'prev' | 'next') => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    const next = dir === 'next'
      ? Math.min(CLONE_FIRST, slotRef.current + 1)
      : Math.max(CLONE_LAST, slotRef.current - 1);

    slotRef.current = next;
    goToSlot(next, 'smooth');

    // On animation complete: snap-wrap if on a clone, then sync player
    const done = () => {
      const s = slotRef.current;
      const slots = getSlots();

      if (s === CLONE_LAST || s === CLONE_FIRST) {
        // ── Phase 1 complete: user saw smooth slide onto clone ──
        // ── Phase 2: silent snap to real slot ────────────────
        const realSlot = s === CLONE_LAST ? LAST_REAL : FIRST_REAL;

        // Pause clone player (visible during phase 1)
        const cloneKey = slots[s].key;
        playersRef.current.get(cloneKey)?.pause();

        // Instant snap — visually identical position
        goToSlot(realSlot, 'auto');
        slotRef.current = realSlot;

        // Resume real counterpart
        const realKey = slots[realSlot].key;
        const realPlayer = playersRef.current.get(realKey);
        if (activeIdRef.current && playersRef.current.has(activeIdRef.current)) {
          playersRef.current.get(activeIdRef.current)?.pause();
        }
        realPlayer?.play();
        activeIdRef.current = realKey;
      } else {
        // Normal move: play the newly visible card
        const key = slots[s].key;
        const player = playersRef.current.get(key);
        if (player && key !== activeIdRef.current) {
          if (activeIdRef.current && playersRef.current.has(activeIdRef.current)) {
            playersRef.current.get(activeIdRef.current)?.pause();
          }
          player.play();
          activeIdRef.current = key;
        }
      }
      transitioningRef.current = false;
    };

    // scrollend event + setTimeout fallback
    const sw = scrollRef.current;
    if (sw && 'onscrollend' in window) {
      sw.addEventListener('scrollend', done, { once: true });
    } else {
      setTimeout(done, 400);
    }
  }, [goToSlot, getSlots]);

  // ── Touch swipe (mobile) ──────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      activateByDelta(dx < 0 ? 'next' : 'prev');
    }
  }, [activateByDelta]);

  // ── Initial position ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => goToSlot(FIRST_REAL, 'auto'), 50);
    return () => clearTimeout(t);
  }, [goToSlot]);

  // ── Reel → hero mute coherence ────────────────────────────
  useEffect(() => {
    const handler = () => {
      playersRef.current.forEach((p: any) => p.setVolume(0));
      setMuted(true);
    };
    window.addEventListener('mute-reels' as any, handler as any);
    return () => window.removeEventListener('mute-reels' as any, handler as any);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      playersRef.current.forEach((p: any) => p.setVolume(next ? 0 : 0.7));
      if (!next) window.dispatchEvent(new CustomEvent('mute-hero'));
      return next;
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────
  const slots = getSlots();

  return (
    <section ref={sectionRef} className="bg-black px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-20 overflow-hidden" id="reels">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-primary text-xl sm:text-2xl md:text-3xl text-center mb-2">
          Event Reels
        </h2>
        <p className="text-white/40 text-xs text-center mb-6 sm:mb-8">Swipe to view more →</p>

        <div className="flex justify-center relative">
          <button
            onClick={() => activateByDelta('prev')}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm items-center justify-center transition-all duration-200 -ml-5"
            aria-label="Previous reel"
          >
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-hidden pb-4 max-w-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ scrollbarWidth: 'none' }}
          >
            {slots.map((s) => (
              <div
                key={s.key}
                data-player-key={s.key}
                data-reel-id={s.id}
                className="flex-shrink-0 w-[70vw] sm:w-[45vw] md:w-[30vw] lg:w-[22vw] rounded-2xl overflow-hidden bg-[#101010]"
              >
                <div className="relative w-full" style={{ paddingTop: '177.78%' }}>
                  {!readyIds.has(s.key) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#181818] rounded-2xl z-10">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                  <iframe
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    title={`Reel ${s.key}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => activateByDelta('next')}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm items-center justify-center transition-all duration-200 -mr-5"
            aria-label="Next reel"
          >
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors"
            aria-label={muted ? 'Unmute reels' : 'Mute reels'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {muted ? 'Unmute reels' : 'Mute reels'}
          </button>
        </div>
      </div>
    </section>
  );
}
