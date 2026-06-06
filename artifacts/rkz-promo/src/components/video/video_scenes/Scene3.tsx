import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800), // UI card appears
      setTimeout(() => setPhase(2), 1500), // Gauge fills
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-bg-dark overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 1.2 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-bg-muted)_0%,_var(--color-bg-dark)_100%)] opacity-80" />
      
      {/* Pattern background */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/pattern.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay"
        animate={{ opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* App UI Frame */}
      <motion.div
        className="relative z-10 w-[320px] md:w-[400px] bg-[#111623] rounded-[2.5rem] border border-primary/20 shadow-[0_0_80px_rgba(201,168,76,0.15)] overflow-hidden flex flex-col"
        initial={{ y: '100vh', rotateX: 45, opacity: 0 }}
        animate={{ y: 0, rotateX: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 1.5 }}
      >
        {/* App Header */}
        <div className="pt-10 pb-6 px-8 text-center border-b border-primary/10">
          <motion.h3 
            className="text-primary font-display text-xl tracking-wide uppercase"
            initial={{ opacity: 0, y: -10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          >
            Eligibility Analysis Engine
          </motion.h3>
        </div>

        {/* App Body */}
        <div className="flex-1 px-8 py-10 flex flex-col items-center justify-center gap-8">
          
          {/* Gauge Container */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Background ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="96" cy="96" r="80"
                stroke="currentColor" strokeWidth="8" fill="none"
                className="text-white/5"
              />
              {/* Progress ring */}
              <motion.circle
                cx="96" cy="96" r="80"
                stroke="#22c55e" strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray="502"
                initial={{ strokeDashoffset: 502 }}
                animate={phase >= 2 ? { strokeDashoffset: 502 - (502 * 0.82) } : { strokeDashoffset: 502 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            
            <div className="text-center">
              <motion.div 
                className="text-6xl font-body font-light text-text-primary leading-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                82
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <motion.div
              className="bg-[#22c55e]/10 text-[#22c55e] px-4 py-1.5 rounded-full font-body text-sm font-medium tracking-wide uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              Recommended: Mortgage
            </motion.div>
            
            <motion.p
              className="text-text-muted font-body text-sm text-center px-4"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              Strong repayment profile — 27% DTI ratio
            </motion.p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
