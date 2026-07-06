import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import WordsPullUpMultiStyle from './WordsPullUpMultiStyle';

const aboutSegments = [
  { text: 'I am Akash Mangeshkar,', className: 'font-normal text-[#E1E0CC]' },
  {
    text: 'a playback singer & frontman.',
    className: 'italic font-serif text-[#E1E0CC]',
  },
  {
    text: 'I lead Goa&apos;s premier Bollywood ensemble for luxury weddings and corporate events.',
    className: 'font-normal text-[#E1E0CC]',
  },
];

const bodyText =
  'Performed with Papon at a Goa concert — 738K views, 31K likes. Our band of 6 seasoned musicians (lead vocals, female vocals, keys, bass, lead guitar, drums) plus professional sound production delivers Bollywood hits, romantic covers, and high-energy live sets that turn every event into an unforgettable experience.';

export default function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1]);

  return (
    <section className="bg-black px-4 sm:px-6 md:px-8 py-4 sm:py-20 md:py-28" id="about">
      <div className="bg-[#101010] rounded-3xl sm:rounded-[2rem] px-6 sm:px-10 md:px-16 py-12 sm:py-16 md:py-20 max-w-6xl mx-auto text-center">
        {/* Label */}
        <p className="text-white/80 text-[10px] sm:text-xs uppercase tracking-widest mb-6 sm:mb-8 md:mb-10">
          Frontman — Akash The Band
        </p>

        {/* Multi-style heading */}
        <div className="max-w-3xl mx-auto">
          <WordsPullUpMultiStyle
            segments={aboutSegments}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-[0.95] sm:leading-[0.9]"
            delay={0.1}
          />
        </div>

        {/* Spacer */}
        <div className="h-8 sm:h-10 md:h-12" />

        {/* Body - scroll-animated characters */}
        <div ref={ref} className="relative max-w-2xl mx-auto">
          <p
            className="text-xs sm:text-sm md:text-base text-[#DEDBC8] leading-relaxed"
            style={{ opacity: 0.2 }}
          >
            {bodyText}
          </p>
          <motion.p
            className="absolute inset-0 text-xs sm:text-sm md:text-base text-[#DEDBC8] leading-relaxed"
            style={{ opacity }}
          >
            {bodyText}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
