import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useVideoPlayer } from '@/lib/video';

export const SCENE_DURATIONS: Record<string, number> = {
  film: 37709,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  useVideoPlayer({ durations, loop });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    onSceneChange?.('film');
  }, [onSceneChange]);

  // RKZ logo appears on the tower in clip 3 (~18-27 s) — cover it
  const coverRkz   = time >= 17 && time <= 27.5;
  // Tech UI panels in clip 4 (~27-37 s) — cover lower half
  const coverTech  = time >= 27;
  // Outro brand close
  const showOutro  = time >= 30;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">

      {/* ── MASTER CINEMATIC FILM ─────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}videos/rozoz_cinematic.mp4`}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted        /* original audio silenced — Ardah replaces it */
        loop={loop}
        playsInline
      />

      {/* ── ALWAYS-ON BRAND STRIP — TOP: روزوز ──────────────────────────── */}
      {/* Visible from first frame through last. High-contrast Arabic calligraphy. */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center pt-6 pointer-events-none"
        style={{ zIndex: 20 }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
      >
        {/* Dark band for contrast */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 60%, transparent 100%)',
            height: '160px',
          }}
        />
        {/* روزوز — Arabic, large, golden */}
        <p
          className="relative"
          style={{
            fontFamily: "'Amiri', 'Scheherazade New', serif",
            fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
            color: '#E8C84A',
            textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 40px rgba(232,200,74,0.8), 0 0 80px rgba(232,200,74,0.4)',
            direction: 'rtl',
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          روزوز
        </p>
      </motion.div>


      {/* ── RKZ COVER (17–27.5 s) — replace tower logo with روزوز ─────────── */}
      <AnimatePresence>
        {coverRkz && (
          <motion.div
            key="cover-rkz"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 15 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Glow aura */}
            <div style={{
              position: 'absolute',
              width: '50vw', height: '50vh',
              background: 'radial-gradient(ellipse at center, rgba(232,200,74,0.22) 0%, transparent 70%)',
              filter: 'blur(24px)',
            }} />
            <div className="relative flex flex-col items-center">
              <img
                src={`${import.meta.env.BASE_URL}rozoz-logo.png`}
                alt="Rozoz"
                style={{
                  width: 'clamp(180px, 30vw, 360px)',
                  filter: 'drop-shadow(0 0 40px rgba(232,200,74,0.9)) drop-shadow(0 4px 8px rgba(0,0,0,0.95))',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TECH-LABEL CLEAN-UP (27–37 s) ────────────────────────────────── */}
      <AnimatePresence>
        {coverTech && (
          <motion.div
            key="clean-tech"
            className="absolute inset-x-0 pointer-events-none"
            style={{ top: '22%', bottom: '14%', zIndex: 10 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="w-full h-full" style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(10,14,26,0.88) 35%, rgba(10,14,26,0.92) 65%, transparent 100%)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── SAUDI ARDAH MUSIC ─────────────────────────────────────────────── */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        loop
        muted={muted}
      />
    </div>
  );
}
