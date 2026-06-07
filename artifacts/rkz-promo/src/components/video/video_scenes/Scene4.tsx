import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-dark overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.8 }}
    >
      {/* KAFD — atmospheric background */}
      <motion.video
        className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity"
        src={`${import.meta.env.BASE_URL}videos/kafd_night.mp4`}
        autoPlay
        muted
        playsInline
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: 1.08, opacity: 0.18 }}
        transition={{ duration: 12, ease: 'linear' }}
      />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,15,0.85) 100%)',
      }} />

      {/* ── Official Brand Lockup ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Logo lockup: falcon + Arabic brand name */}
        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0, y: 30, scale: 0.88 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.88 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Golden falcon */}
          <motion.div
            className="relative"
            animate={phase >= 1 ? { rotate: [0, -3, 3, 0] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border border-primary/40"
              style={{ margin: '-10px' }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img
              src={`${import.meta.env.BASE_URL}images/falcon.png`}
              className="w-[18vw] max-w-[160px] h-auto object-contain"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.7)) drop-shadow(0 0 6px rgba(201,168,76,0.5))',
              }}
              initial={{ opacity: 0, x: -16 }}
              animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            />
          </motion.div>

          {/* Vertical divider */}
          <motion.div
            className="w-[1px] bg-primary/50 self-stretch"
            style={{ minHeight: '80px' }}
            initial={{ scaleY: 0 }}
            animate={phase >= 1 ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />

          {/* Brand text block — Arabic primary, Latin secondary */}
          <motion.div
            className="flex flex-col gap-1"
            style={{ direction: 'rtl', textAlign: 'right' }}
            initial={{ opacity: 0, x: 16 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Arabic name — dominant, calligraphy */}
            <span
              style={{
                fontFamily: "'Amiri', 'Scheherazade New', serif",
                fontSize: 'clamp(3rem, 6.5vw, 5.5rem)',
                color: '#C9A84C',
                letterSpacing: '0.06em',
                lineHeight: 1,
                textShadow: '0 0 30px rgba(201,168,76,0.5)',
              }}
            >
              روزوز
            </span>
            {/* Latin lockup */}
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(0.9rem, 2vw, 1.6rem)',
                color: 'rgba(201,168,76,0.55)',
                letterSpacing: '0.45em',
                textAlign: 'left',
                direction: 'ltr',
              }}
            >
              ROZOZ
            </span>
            {/* Arabic sub-tagline */}
            <span
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: 'clamp(0.6rem, 1.3vw, 1rem)',
                color: 'rgba(245,240,232,0.45)',
                letterSpacing: '0.2em',
                direction: 'rtl',
              }}
            >
              الحلول الذكية للعقارات
            </span>
          </motion.div>
        </motion.div>

        {/* Gold rule */}
        <motion.div
          className="w-48 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={phase >= 2 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />

        {/* CTA — Arabic */}
        <motion.p
          className="text-text-primary text-center"
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 'clamp(1.1rem, 2.5vw, 2.2rem)',
            direction: 'rtl',
            letterSpacing: '0.05em',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          حمّل تطبيق روزوز الآن
        </motion.p>

        {/* Small Latin CTA */}
        <motion.p
          className="text-text-muted text-center font-body uppercase tracking-[0.35em]"
          style={{ fontSize: 'clamp(0.55rem, 1.1vw, 0.85rem)' }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 0.45 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          Download Rozoz · وكيلك العقاري الحصري
        </motion.p>
      </div>
    </motion.div>
  );
}
