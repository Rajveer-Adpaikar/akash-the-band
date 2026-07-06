import { useState, useRef, useCallback } from 'react';
import { ArrowRight, Volume2, VolumeX } from 'lucide-react';
import WordsPullUp from './WordsPullUp';

function postToPlayer(ref: React.RefObject<HTMLIFrameElement | null>, func: string) {
  try {
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  } catch {}
}

export default function HeroSection() {
  const [muted, setMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const iosKey = useRef(0);
  const [, forceRender] = useState(0);

  const toggleMute = useCallback(() => {
    if (isIOS) {
      // iOS Safari: postMessage is unreliable. Recreate iframe inside user
      // gesture so Safari allows autoplay-with-sound on the new iframe.
      iosKey.current++;
      forceRender((n) => n + 1);
    } else {
      postToPlayer(iframeRef, muted ? 'unMute' : 'mute');
    }
    setMuted((m) => !m);
  }, [muted, isIOS]);

  return (
    <section className="h-screen p-4 md:p-6">
      <div className="relative h-full w-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-black">
        {/* YouTube iframe background */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            key={isIOS ? iosKey.current : undefined}
            ref={!isIOS ? iframeRef : undefined}
            src={`https://www.youtube.com/embed/Eomk8ivqQSA?autoplay=1&loop=1&playlist=Eomk8ivqQSA&controls=0&modestbranding=1&rel=0&playsinline=1&mute=${muted ? 1 : 0}&enablejsapi=${isIOS ? 0 : 1}`}
            className="absolute top-1/2 left-1/2 w-full min-w-full h-full min-h-full -translate-x-1/2 -translate-y-1/2 md:w-[177.78vh] md:h-[56.25vw] pointer-events-none"
            allow="autoplay; encrypted-media"
            title="Sapna Jahan - Akash Mangeshkar Cover"
          />
        </div>

        {/* Noise overlay */}
        <div className="noise-overlay" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

        {/* Mute/Unmute button */}
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all duration-200"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Navbar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8">
            <div className="flex items-center gap-3 sm:gap-6 md:gap-12 lg:gap-14">
              {['About', 'Services', 'Projects', 'Contact'].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="text-[10px] sm:text-xs md:text-sm whitespace-nowrap transition-colors duration-200"
                    style={{ color: 'rgba(225, 224, 204, 0.8)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E1E0CC')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = 'rgba(225, 224, 204, 0.8)')
                    }
                  >
                    {item}
                  </a>
                )
              )}
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 md:px-10 lg:px-12 pb-6 sm:pb-8 md:pb-10">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 md:col-span-8">
              <h1
                className="font-medium leading-[0.85] tracking-[-0.07em] text-[#E1E0CC] relative inline-block"
                style={{ fontSize: 'clamp(5rem, 26vw, 20vw)' }}
              >
                <WordsPullUp
                  text="Akash"
                  className="relative"
                  wordClassName="relative"
                  delay={0.15}
                />
              </h1>
            </div>

            <div className="col-span-12 md:col-span-4 pl-0 md:pl-4">
              <p
                className="text-white text-xs sm:text-sm md:text-base leading-[1.2] mb-4 sm:mb-6 drop-shadow-md"
                style={{ animation: 'fadeUp 0.6s 0.5s both' }}
              >
                Goa&apos;s premier Bollywood ensemble — a 6-piece band bringing
                high-energy live performances, romantic covers, and unforgettable
                entertainment to destination weddings and corporate events across India.
              </p>

              <a
                href="tel:+919923837062"
                className="group inline-flex items-center gap-2 bg-primary rounded-full text-black font-medium text-sm sm:text-base px-5 sm:px-6 py-2 sm:py-2.5 transition-all duration-300 hover:gap-3 shadow-2xl shadow-black/80"
                style={{ animation: 'fadeUp 0.6s 0.7s both' }}
              >
                Book Now
                <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
