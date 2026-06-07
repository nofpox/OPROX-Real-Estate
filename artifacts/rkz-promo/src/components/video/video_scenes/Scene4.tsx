import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),   // logo / falcon materialise
      setTimeout(() => setPhase(2), 1800),  // brand name
      setTimeout(() => setPhase(3), 3000),  // CTA line
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
      {/* KAFD — very dim, purely atmospheric */}
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
      <div className="absolute inset-0 bg-radial-gradient" style={{
        background: 'radial-gradient(ellipse at center, transparent 20%, rgba(10,10,15,0.85) 100%)',
      }} />

      {/* ── Official Logo Frame ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Logo lockup: golden falcon (left) + brand name (right) */}
        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0, y: 30, scale: 0.88 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.88 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Golden falcon — the primary brand mark */}
          <motion.div
            className="relative"
            animate={phase >= 1 ? { rotate: [0, -3, 3, 0] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            {/* Outer gold ring */}
            <motion.div
              className="absolute inset-0 rounded-full border border-primary/40"
              style={{ margin: '-10px' }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Falcon image — natural colours, gold drop-shadow */}
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

          {/* Brand text block */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, x: 16 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <span
              className="font-display text-primary leading-none"
              style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', letterSpacing: '0.12em' }}
            >
              Rozoz
            </span>
            <span
              className="text-text-muted font-body uppercase tracking-[0.3em]"
              style={{ fontSize: 'clamp(0.6rem, 1.4vw, 1rem)' }}
            >
              Smart Solutions
            </span>
          </motion.div>
        </motion.div>

        {/* Thin gold rule */}
        <motion.div
          className="w-48 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={phase >= 2 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />

        {/* CTA */}
        <motion.p
          className="font-display text-text-primary uppercase tracking-widest text-center"
          style={{ fontSize: 'clamp(1rem, 2.4vw, 2rem)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          Download the Rozoz app now
        </motion.p>
      </div>
    </motion.div>
  );
}
