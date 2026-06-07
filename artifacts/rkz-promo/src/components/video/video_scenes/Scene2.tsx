import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // falcon arrives
      setTimeout(() => setPhase(2), 2200),  // "Luxury Tech" fades in
      setTimeout(() => setPhase(3), 3600),  // brand sub-line
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-dark overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
    >
      {/* KAFD night skyline */}
      <motion.video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${import.meta.env.BASE_URL}videos/kafd_night.mp4`}
        autoPlay
        muted
        playsInline
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 0.65, scale: 1 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      />

      {/* Geometric pattern overlay — Islamic lattice aesthetic */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/pattern.png`}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0 }}
        animate={{ opacity: [0, 0.18, 0.12] }}
        transition={{ duration: 4, times: [0, 0.4, 1] }}
      />

      {/* Deep atmospheric gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/50 via-transparent to-transparent" />

      {/* ── Realistic Falcon — continuing from desert into KAFD ─────────────── */}
      {/* Picks up exactly where Scene 1 left off: enters from right-of-center,
          sweeps across the skyline and exits upper-right — a single fluid arc */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/falcon.png`}
        className="absolute h-auto object-contain"
        style={{
          width: '26vw',
          top: '30%',
          left: 0,
          filter: 'drop-shadow(0 4px 24px rgba(201,168,76,0.35))',
        }}
        initial={{ x: '-20vw', y: '12vh', rotate: 8, scale: 0.9, opacity: 0 }}
        animate={
          phase >= 1
            ? {
                x: ['−20vw', '15vw', '55vw', '95vw'],
                y: ['12vh', '-5vh', '-16vh', '-22vh'],
                rotate: [8, 0, -6, -10],
                scale: [0.9, 1.1, 1.3, 1.05],
                opacity: [0, 1, 1, 0],
              }
            : { x: '-20vw', y: '12vh', rotate: 8, scale: 0.9, opacity: 0 }
        }
        transition={{
          duration: 6,
          ease: [0.25, 1, 0.4, 1],
          times: [0, 0.25, 0.7, 1],
        }}
      />

      {/* Subtle golden light trail behind the falcon */}
      <motion.div
        className="absolute h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
        style={{ top: '44%', left: 0, right: 0 }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={phase >= 1 ? { opacity: [0, 0.5, 0], scaleX: [0, 1, 0] } : {}}
        transition={{ duration: 3.5, delay: 0.6, ease: 'easeInOut' }}
      />

      {/* Text content */}
      <div className="relative z-10 flex flex-col items-center" style={{ marginTop: '35vh' }}>
        <motion.h2
          className="text-[3.5vw] font-display text-primary tracking-[0.3em] uppercase"
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={
            phase >= 2
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 20, filter: 'blur(8px)' }
          }
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          Luxury Tech
        </motion.h2>

        <motion.div
          className="h-[1px] bg-primary/60 w-20 mt-3"
          initial={{ scaleX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />

        <motion.p
          className="text-text-muted font-body text-[1.6vw] tracking-[0.28em] uppercase mt-4"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 0.7 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          Smart Real Estate · KAFD
        </motion.p>
      </div>
    </motion.div>
  );
}
