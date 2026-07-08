import { useState, useRef } from 'react';
import { ArrowRight, Volume2, VolumeX } from 'lucide-react';
import InquiryModal from './InquiryModal';

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
  const [showInquiry, setShowInquiry] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    postToPlayer(iframeRef, muted ? 'unMute' : 'mute');
    setMuted((m) => !m);
  };

  return (
    <section>
      <div className="relative h-[50vh] md:h-dvh w-full p-0 md:p-6 md:rounded-2xl md:rounded-[2rem] overflow-hidden bg-black">
        {/* YouTube iframe background */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            ref={iframeRef}
            src="https://www.youtube.com/embed/Eomk8ivqQSA?autoplay=1&loop=1&playlist=Eomk8ivqQSA&controls=0&modestbranding=1&rel=0&playsinline=1&mute=1&enablejsapi=1"
            className="absolute top-1/2 left-1/2 w-full min-w-full h-full min-h-full -translate-x-1/2 -translate-y-1/2 md:w-[177.78vh] md:h-[56.25vw] pointer-events-none"
            allow="autoplay; encrypted-media"
            title=""
          />
        </div>

        {/* Noise overlay */}
        <div className="noise-overlay" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

        {/* Transparent overlay to block YouTube touch UI (title, controls on mobile) */}
        <div className="absolute inset-0 z-[5]" />

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

        {/* Text + CTA on video — desktop only */}
        <div className="hidden md:block absolute left-0 right-0 z-10 px-6 sm:px-8 md:px-10 lg:px-12 bottom-6 sm:bottom-8 md:bottom-12 pb-2 sm:pb-2">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 md:col-span-4 md:col-start-9">
              <p className="text-white text-xs sm:text-sm md:text-base leading-[1.2] mb-4 sm:mb-6 drop-shadow-md">
                Goa&apos;s premier Bollywood ensemble — a 6-piece band bringing
                high-energy live performances, romantic covers, and unforgettable
                entertainment to destination weddings and corporate events across India.
              </p>
              <button
                onClick={() => setShowInquiry(true)}
                className="group inline-flex items-center gap-2 bg-primary rounded-full text-black font-medium text-sm sm:text-base px-5 sm:px-6 py-2 sm:py-2.5 transition-all duration-300 hover:gap-3 shadow-2xl shadow-black/80"
              >
                Inquire Now
                <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Text + CTA below video — mobile only */}
      <div className="block md:hidden max-w-6xl mx-auto px-6 py-0">
        <p className="text-white text-sm leading-relaxed mb-6">
          Goa&apos;s premier Bollywood ensemble — a 6-piece band bringing
          high-energy live performances, romantic covers, and unforgettable
          entertainment to destination weddings and corporate events across India.
        </p>
        <button
          onClick={() => setShowInquiry(true)}
          className="group inline-flex items-center gap-2 bg-primary rounded-full text-black font-medium text-sm px-5 py-2.5 transition-all duration-300 hover:gap-3"
        >
          Inquire Now
          <span className="bg-black rounded-full w-9 h-9 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <ArrowRight className="w-4 h-4 text-primary" />
          </span>
        </button>
      </div>

      <InquiryModal open={showInquiry} onClose={() => setShowInquiry(false)} />
    </section>
  );
}
