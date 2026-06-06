import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
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
      {/* Background Video */}
      <motion.video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${import.meta.env.BASE_URL}videos/desert_dunes.mp4`}
        autoPlay
        muted
        playsInline
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.8 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />
      
      {/* Dark overlay for atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/40 to-bg-dark/80" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          className="text-[4vw] font-display text-text-primary tracking-widest uppercase mb-4"
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={phase >= 1 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 20, filter: 'blur(10px)' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Discover Saudi
        </motion.h1>
        
        <motion.div
          className="h-[1px] bg-primary w-24"
          initial={{ scaleX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  );
}
