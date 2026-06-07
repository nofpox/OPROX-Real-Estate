import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),   // title fades in
      setTimeout(() => setPhase(2), 2200),  // falcon appears
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-dark overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      {/* Desert dunes video */}
      <motion.video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${import.meta.env.BASE_URL}videos/desert_dunes.mp4`}
        autoPlay
        muted
        playsInline
        initial={{ scale: 1.12, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.82 }}
        transition={{ duration: 7, ease: 'easeOut' }}
      />

      {/* Rich atmospheric gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/30 via-transparent to-bg-dark/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/40 via-transparent to-transparent" />

      {/* ── Realistic Falcon — desert launch ───────────────────────────────── */}
      {/* The falcon rises from the dune horizon and arcs toward the city */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/falcon.png`}
        className="absolute w-[22vw] h-auto object-contain"
        style={{ bottom: '28%', left: 0 }}
        initial={{ x: '-15vw', y: '8vh', rotate: -8, scale: 0.7, opacity: 0 }}
        animate={
          phase >= 2
            ? { x: '65vw', y: '-18vh', rotate: 6, scale: 1.15, opacity: 1 }
            : { x: '-15vw', y: '8vh', rotate: -8, scale: 0.7, opacity: 0 }
        }
        transition={{
          duration: 5.5,
          ease: [0.2, 0.8, 0.4, 1],
        }}
      />

      {/* Title */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          className="text-[4.5vw] font-display text-text-primary tracking-widest uppercase mb-4"
          initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
          animate={
            phase >= 1
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 24, filter: 'blur(12px)' }
          }
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Discover Saudi
        </motion.h1>

        <motion.div
          className="h-[1px] bg-primary w-28"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={phase >= 1 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 1.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />

        <motion.p
          className="text-text-muted font-body text-[1.8vw] tracking-[0.35em] uppercase mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 0.65, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 1.4, delay: 1.1 }}
        >
          Where heritage meets horizon
        </motion.p>
      </div>
    </motion.div>
  );
}
