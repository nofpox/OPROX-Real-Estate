import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 3000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-dark overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      {/* Background Image / Video */}
      <motion.video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${import.meta.env.BASE_URL}videos/kafd_night.mp4`}
        autoPlay
        muted
        playsInline
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 2 }}
      />
      
      {/* Pattern overlay */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/pattern.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        initial={{ rotate: -5, scale: 1.2 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 10, ease: 'linear' }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent" />

      {/* Falcon */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/falcon.png`}
        className="absolute w-[30vw] h-auto object-contain drop-shadow-2xl"
        initial={{ x: '-60vw', y: '20vh', rotate: 15, scale: 0.8 }}
        animate={{ x: '10vw', y: '-10vh', rotate: -5, scale: 1.2 }}
        transition={{ duration: 6, ease: [0.25, 1, 0.5, 1] }}
        style={{ filter: 'brightness(0) invert(1) opacity(0.8)' }}
      />

      <div className="relative z-10 flex flex-col items-center mt-[30vh]">
        <motion.h2
          className="text-[3vw] font-display text-primary tracking-widest"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          Luxury Tech
        </motion.h2>
      </div>
    </motion.div>
  );
}
