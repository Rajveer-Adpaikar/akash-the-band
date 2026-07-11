import { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReelData {
  vimeo: string;
  instagram?: string;
  caption?: string;
}

const REELS: ReelData[] = [
  { vimeo: '1208819326', caption: 'Latest performance highlight' },
  { vimeo: '1208158917', instagram: 'https://www.instagram.com/reel/DTzWuQPDDwR/', caption: 'Live at a Goan destination' },
  { vimeo: '1208158916', instagram: 'https://www.instagram.com/reel/DZC7xYMSejP/', caption: 'High-energy performance with Papon' },
  { vimeo: '1208158881', instagram: 'https://www.instagram.com/reel/DVlh_pwj-PQ/', caption: 'Corporate event performance' },
  { vimeo: '1208158886', instagram: 'https://www.instagram.com/reel/DaVXSECMIhq/', caption: 'Wedding sangeet highlights' },
  { vimeo: '1208819325', caption: 'Romantic Bollywood cover' },
  { vimeo: '1208819327', caption: 'Romantic moments made musical' },
];

const LOAD_RETRIES = 2;
const READY_TIMEOUT = 10000;

const NUM_REALS = REELS.length;       // 7
const CLONE_LAST = 0;
const FIRST_REAL = 1;
const LAST_REAL = NUM_REALS;          // 7
const CLONE_FIRST = NUM_REALS + 1;    // 8
const SNAP_MS = 350;

interface PlayerResult {
  id: string;
  player: any;
}

function initReelPlayer(el: Element, retriesLeft = LOAD_RETRIES): Promise<PlayerResult | null> {
  return new Promise((resolve) => {
    const id = el.getAttribute('data-reel-id');
    if (!id) return resolve(null);

    const iframe = el.querySelector<HTMLIFrameElement>('iframe');
    if (!iframe || iframe.src) return resolve(null);

    iframe.src = `https://player.vimeo.com/video/${id}?badge=0&autopause=0&player_id=0&app_id=58479&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1&muted=1`;

    let done = false;

    const finish = (err?: boolean) => {
      if (done) return;
      done = true;
      if (err && retriesLeft > 0) {
        iframe.src = '';
        setTimeout(() => resolve(initReelPlayer(el, retriesLeft - 1)), 1000);
      } else if (err) {
        resolve(null);
      }
    };

    const player = new (window as any).Vimeo.Player(iframe);
    const timer = setTimeout(() => finish(true), READY_TIMEOUT);

    player.ready()
      .then(() => {
        clearTimeout(timer);
        if (done) return;
        done = true;
        player.setVolume(0).then(() => player.pause());
        if (id === '1208158886') player.setCurrentTime(1);
        resolve({ id, player });
      })
      .catch(() => {
        clearTimeout(timer);
        finish(true);
      });
  });
}

function buildSlots() {
  const slots: { key: string; vimeo: string; instagram?: string; caption?: string; isClone: boolean }[] = [];
  slots.push({ key: `${REELS[NUM_REALS - 1].vimeo}-clone-end`, ...REELS[NUM_REALS - 1], isClone: true });
  for (let i = 0; i < NUM_REALS; i++) {
    slots.push({ key: REELS[i].vimeo, ...REELS[i], isClone: false });
  }
  slots.push({ key: `${REELS[0].vimeo}-clone-start`, ...REELS[0], isClone: true });
  return slots;
}

export default function ReelsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const playersRef = useRef<Map<string, any>>(new Map());
  const activeKeyRef = useRef<string | null>(null);
  const slotRef = useRef(FIRST_REAL);
  const movingRef = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const seenRef = useRef(false);
  const [muted, setMuted] = useState(true);
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // ── Player init ────────────────────────────────────────────

  const startPlayer = useCallback((el: Element) => {
    const players = playersRef.current;
    const key = el.getAttribute('data-player-key');
    const id = el.getAttribute('data-reel-id');
    const isClone = el.getAttribute('data-clone') === 'true';
    if (!key || !id || players.has(key) || isClone) return;
    initReelPlayer(el).then((result) => {
      if (!result) {
        setFailedIds((prev) => new Set(prev).add(key));
        return;
      }
      players.set(key, result.player);
      setReadyIds((prev) => new Set(prev).add(key));
    });
  }, []);

  // Init reel 1 immediately; after it loads, chain reels 2 & 7, then lazy rest
  useEffect(() => {
    const cards = outerRef.current?.querySelectorAll<HTMLElement>('[data-player-key]');
    if (!cards || !cards[FIRST_REAL]) return;

    const waitVimeo = (fn: () => void) => {
      if ((window as any).Vimeo?.Player) fn();
      else requestAnimationFrame(() => waitVimeo(fn));
    };

    waitVimeo(() => {
      const el1 = cards[FIRST_REAL];
      const key1 = el1.getAttribute('data-player-key')!;

      // Init reel 1 directly — get the promise
      initReelPlayer(el1).then((result) => {
        if (result) {
          playersRef.current.set(key1, result.player);
          setReadyIds((prev) => new Set(prev).add(key1));
        } else {
          setFailedIds((prev) => new Set(prev).add(key1));
        }

        // Reel 1 is done — now init reels 2 and 7
        [FIRST_REAL + 1, LAST_REAL].forEach((i) => {
          const el = cards[i];
          if (el) startPlayer(el);
        });

        // Lazy init the rest (clone-of-last + 3..6) with stagger
        cards.forEach((el, i) => {
          if (i === FIRST_REAL || i === FIRST_REAL + 1 || i === LAST_REAL) return;
          setTimeout(() => {
            waitVimeo(() => startPlayer(el));
          }, (i - 1) * 400);
        });
      });
    });
  }, [startPlayer]);

  // ── Transform-driven navigation ────────────────────────────

  /** Slide the tray so the card at `slot` is visually centered.
   *  `animated=false` disables the CSS transition (used on mount
   *  and for the invisible wrap-back snap). */
  const snap = useCallback((slot: number, animated: boolean) => {
    const outer = outerRef.current;
    const tray = trayRef.current;
    if (!outer || !tray) return;

    const el = tray.children[slot] as HTMLElement | undefined;
    if (!el) return;

    const outerW = outer.offsetWidth;
    const elLeft = el.offsetLeft;
    const elW = el.offsetWidth;
    const offset = outerW / 2 - (elLeft + elW / 2);

    slotRef.current = slot;

    if (animated) {
      tray.style.transition = `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    } else {
      tray.style.transition = 'none';
    }
    tray.style.transform = `translateX(${offset}px)`;
    if (!animated) tray.offsetHeight; // force layout
  }, []);

  // Initial snap to slot 1 (first real reel) on mount
  useEffect(() => {
    const t = setTimeout(() => snap(FIRST_REAL, false), 100);
    return () => clearTimeout(t);
  }, [snap]);

  // Auto-play slot 1 when the section scrolls into view (once)
  useEffect(() => {
    const section = sectionRef.current;
    const firstKey = buildSlots()[FIRST_REAL].key;
    if (!section || seenRef.current) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seenRef.current) {
          seenRef.current = true;
          const player = playersRef.current.get(firstKey);
          if (!player) return;
          player.play();
          activeKeyRef.current = firstKey;
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(section);
    return () => obs.disconnect();
  }, [readyIds]);

  // Mute reels when hero unmutes
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

  // ── Navigate ───────────────────────────────────────────────

  const navigate = useCallback((dir: -1 | 1) => {
    if (movingRef.current) return;
    movingRef.current = true;

    const current = slotRef.current;
    const nextSlot = current + dir;
    const slots = buildSlots();

    // Wrap-around: instant teleport, no animation (avoids clone Vimeo flash)
    if (nextSlot < FIRST_REAL || nextSlot > LAST_REAL) {
      const target = dir === -1 ? LAST_REAL : FIRST_REAL;
      snap(target, false);
      if (activeKeyRef.current && playersRef.current.has(activeKeyRef.current)) {
        playersRef.current.get(activeKeyRef.current)?.pause();
      }
      playersRef.current.get(slots[target].key)?.play();
      activeKeyRef.current = slots[target].key;
      movingRef.current = false;
      return;
    }

    // Normal: smooth slide to adjacent reel
    snap(nextSlot, true);

    const onDone = () => {
      movingRef.current = false;
      const key = slots[nextSlot].key;
      const player = playersRef.current.get(key);
      if (player && key !== activeKeyRef.current) {
        if (activeKeyRef.current && playersRef.current.has(activeKeyRef.current)) {
          playersRef.current.get(activeKeyRef.current)?.pause();
        }
        player.play();
        activeKeyRef.current = key;
      }
    };
    setTimeout(onDone, SNAP_MS + 50);
  }, [snap]);

  const scrollLeft = useCallback(() => navigate(-1), [navigate]);
  const scrollRight = useCallback(() => navigate(1), [navigate]);

  // ── Touch swipe ────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    // Only block scroll when horizontal movement clearly dominates
    if (dx > dy && dx > 20) e.preventDefault();
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 30) return;
    navigate(dx > 0 ? -1 : 1);
  }, [navigate]);

  // ── Render ─────────────────────────────────────────────────

  const slots = buildSlots();

  return (
    <section ref={sectionRef} className="bg-black px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-20" id="reels">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-primary text-xl sm:text-2xl md:text-3xl text-center mb-2" style={{ textWrap: 'balance' }}>
          Event Reels
        </h2>
        <p className="text-white/40 text-xs text-center mb-6 sm:mb-8">Tap arrows or swipe to browse</p>

        <div className="relative flex justify-center">
          <button
            onClick={scrollLeft}
            aria-label="Previous reel"
            className="flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-11 h-11 -ml-0.5 sm:-ml-5 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm text-white hover:bg-white/25 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div ref={outerRef} className="overflow-hidden max-w-full w-full">
            <div
              ref={trayRef}
              className="flex gap-3 sm:gap-4"
              style={{ willChange: 'transform' }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
            {slots.map((s) => {
              const loaded = readyIds.has(s.key);
              const failed = failedIds.has(s.key);
              return (
                <div
                  key={s.key}
                  data-player-key={s.key}
                  data-reel-id={s.vimeo}
                  data-clone={s.isClone ? 'true' : undefined}
                  className="flex-shrink-0 w-[70vw] sm:w-[45vw] md:w-[30vw] lg:w-[22vw] rounded-2xl overflow-hidden bg-[#101010]"
                >
                  <div className="relative w-full" style={{ paddingTop: '177.78%' }}>
                    {!s.isClone && !loaded && !failed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#181818] rounded-2xl z-10">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                      </div>
                    )}
                    {failed && s.instagram && (
                      <a
                        href={s.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex flex-col items-center justify-center bg-[#181818] rounded-2xl z-10 gap-2 p-4 hover:bg-[#222] transition-colors"
                      >
                        <AlertTriangle className="w-6 h-6 text-white/30" />
                        <p className="text-white/30 text-xs text-center">Open in Instagram</p>
                      </a>
                    )}
                    <iframe
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      title={s.caption || `Reel ${s.key}`}
                      src={s.isClone ? `https://player.vimeo.com/video/${s.vimeo}?badge=0&autopause=0&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1&muted=1` : undefined}
                    />
                  </div>
                  {s.caption && !s.isClone && (
                    <p className="text-white/50 text-[10px] sm:text-xs text-center py-2 px-2 truncate">
                      {s.caption}
                    </p>
                  )}
                </div>
              );
            })}
            </div>
          </div>

          <button
            onClick={scrollRight}
            aria-label="Next reel"
            className="flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-11 h-11 -mr-0.5 sm:-mr-5 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm text-white hover:bg-white/25 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
