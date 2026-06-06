import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Logo appears
      setTimeout(() => setPhase(2), 2500), // CTA appears
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-dark overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      <motion.video
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
        src={`${import.meta.env.BASE_URL}videos/kafd_night.mp4`}
        autoPlay
        muted
        playsInline
        initial={{ scale: 1 }}
        animate={{ scale: 1.1 }}
        transition={{ duration: 10 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-12">
        <motion.div
          className="w-48 h-48 bg-primary rounded-full flex items-center justify-center"
          initial={{ scale: 0, rotate: -90, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0, rotate: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <span className="text-bg-dark font-display text-6xl font-bold">Rkz</span>
        </motion.div>

        <motion.div
          className="text-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <motion.p 
            className="text-text-primary font-display text-2xl md:text-4xl tracking-widest uppercase"
            initial={{ y: 20 }}
            animate={phase >= 2 ? { y: 0 } : { y: 20 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            Download the Rkz app now
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
