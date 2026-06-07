import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // falcon arrives
      setTimeout(() => setPhase(2), 2200),  // headline fades in
      setTimeout(() => setPhase(3), 3600),  // sub-line + calligraphy pulse
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

      {/* Islamic lattice pattern overlay */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/pattern.png`}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0 }}
        animate={{ opacity: [0, 0.18, 0.12] }}
        transition={{ duration: 4, times: [0, 0.4, 1] }}
      />

      {/* Atmospheric gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/50 via-transparent to-transparent" />

      {/* ── "روزوز" Arabic calligraphy on the skyscraper ─────────────────────── */}
      {/* Positioned at upper-center, overlaid on the tallest building */}
      <motion.div
        className="absolute"
        style={{ top: '14%', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={
          phase >= 2
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.82 }
        }
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Outer glow aura */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.35) 0%, transparent 70%)',
            filter: 'blur(18px)',
            transform: 'scale(1.6)',
          }}
          animate={phase >= 3 ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.6 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* The calligraphy text */}
        <motion.p
          style={{
            fontFamily: "'Amiri', 'Scheherazade New', serif",
            fontSize: 'clamp(3rem, 7vw, 6rem)',
            color: '#C9A84C',
            textShadow:
              '0 0 40px rgba(201,168,76,0.9), 0 0 80px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.8)',
            letterSpacing: '0.08em',
            direction: 'rtl',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
          animate={phase >= 3 ? { textShadow: [
            '0 0 40px rgba(201,168,76,0.9), 0 0 80px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.8)',
            '0 0 60px rgba(201,168,76,1),   0 0 120px rgba(201,168,76,0.7), 0 2px 8px rgba(0,0,0,0.8)',
            '0 0 40px rgba(201,168,76,0.9), 0 0 80px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.8)',
          ] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          روزوز
        </motion.p>
        {/* ROZOZ latin beneath in smaller caps */}
        <motion.p
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(0.75rem, 1.8vw, 1.4rem)',
            color: 'rgba(201,168,76,0.65)',
            letterSpacing: '0.55em',
            textAlign: 'center',
            marginTop: '4px',
          }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          ROZOZ
        </motion.p>
      </motion.div>

      {/* ── Falcon sweeping the skyline ──────────────────────────────────────── */}
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
                x: ['-20vw', '15vw', '55vw', '95vw'],
                y: ['12vh', '-5vh', '-16vh', '-22vh'],
                rotate: [8, 0, -6, -10],
                scale: [0.9, 1.1, 1.3, 1.05],
                opacity: [0, 1, 1, 0],
              }
            : { x: '-20vw', y: '12vh', rotate: 8, scale: 0.9, opacity: 0 }
        }
        transition={{ duration: 6, ease: [0.25, 1, 0.4, 1], times: [0, 0.25, 0.7, 1] }}
      />

      {/* Golden light trail */}
      <motion.div
        className="absolute h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"
        style={{ top: '44%', left: 0, right: 0 }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={phase >= 1 ? { opacity: [0, 0.5, 0], scaleX: [0, 1, 0] } : {}}
        transition={{ duration: 3.5, delay: 0.6, ease: 'easeInOut' }}
      />

      {/* Text content — Arabic */}
      <div className="relative z-10 flex flex-col items-center" style={{ marginTop: '35vh' }}>
        <motion.h2
          className="text-[3.5vw] text-primary tracking-[0.2em]"
          style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={
            phase >= 2
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 20, filter: 'blur(8px)' }
          }
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          التقنية الراقية
        </motion.h2>

        <motion.div
          className="h-[1px] bg-primary/60 w-20 mt-3"
          initial={{ scaleX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />

        <motion.p
          className="text-text-muted font-body text-[1.6vw] tracking-[0.2em] mt-4"
          style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 0.7 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          العقارات الذكية · كافد
        </motion.p>
      </div>

      {/* Voiceover subtitle */}
      <motion.div
        className="absolute bottom-12 left-0 right-0 flex justify-center px-8"
        initial={{ opacity: 0, y: 8 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 1, delay: 0.4 }}
      >
        <p
          className="text-text-primary/80 text-[1.5vw] text-center px-6 py-2 rounded-xl"
          style={{
            fontFamily: "'Amiri', serif",
            direction: 'rtl',
            background: 'rgba(10,14,26,0.55)',
            backdropFilter: 'blur(6px)',
            letterSpacing: '0.03em',
            lineHeight: '1.8',
          }}
        >
          روزوز.. حيثُ تلتقي التقنيةُ الراقيةُ بعالمِ العقاراتِ الفاخرة
        </p>
      </motion.div>
    </motion.div>
  );
}
