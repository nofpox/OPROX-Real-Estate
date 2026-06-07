import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useVideoPlayer } from '@/lib/video';

// Single "scene" = full film duration. Used by VideoWithControls for the
// recording timer and progress bar. Do NOT change the key.
export const SCENE_DURATIONS: Record<string, number> = {
  film: 37709,
};

// ─── Overlay phase logic ────────────────────────────────────────────────────
// The original film has 4 clips (each ~9 s):
//  0–9 s   : desert / falcon launch
//  9–18 s  : desert flight
//  18–27 s : falcon arrives at KAFD — RKZ logo visible in this window
//  27–37 s : falcon eye-zoom / tech UI panels
//
// We cover the RKZ logo in clip 3 and clean up tech labels in clip 4.
function getPhase(t: number) {
  return {
    showIntroBrand:  t < 4,                        // 0–4 s: opening brand reveal
    showCoverRkz:    t >= 17.5 && t <= 27,         // 17.5–27 s: cover RKZ logo
    showCleanTech:   t >= 27,                       // 27–37 s: cover tech labels
    showOutroBrand:  t >= 30,                       // 30–37 s: final brand close
  };
}

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
  // keeps the recording lifecycle alive (stopRecording after film ends)
  useVideoPlayer({ durations, loop });

  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const [time, setTime] = useState(0);

  // Track video time for overlays
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, []);

  // Sync Ardah audio mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // Notify parent on film start (for recording jump-to)
  useEffect(() => {
    onSceneChange?.('film');
  }, [onSceneChange]);

  const { showIntroBrand, showCoverRkz, showCleanTech, showOutroBrand } = getPhase(time);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: '#0A0E1A' }}
    >
      {/* ── MASTER CINEMATIC FILM ─────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}videos/rozoz_cinematic.mp4`}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted           // original audio is silenced; Ardah track replaces it
        loop={loop}
        playsInline
      />

      {/* ── AMBIENT OVERLAYS (always present) ────────────────────────────── */}
      {/* Top vignette – legibility of brand text */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
      {/* Bottom vignette – cleans up any lower-third UI / tech labels */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      {/* ── PERSISTENT "روزوز" WATERMARK ──────────────────────────────────── */}
      <motion.div
        className="absolute top-6 left-0 right-0 flex justify-center items-center gap-3 pointer-events-none"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 0.72, y: 0 }}
        transition={{ duration: 1.6, delay: 0.5 }}
      >
        <span
          style={{
            fontFamily: "'Amiri', 'Scheherazade New', serif",
            fontSize: 'clamp(1.6rem, 3.5vw, 3rem)',
            color: '#C9A84C',
            textShadow: '0 0 24px rgba(201,168,76,0.7)',
            direction: 'rtl',
          }}
        >
          روزوز
        </span>
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(0.55rem, 1.1vw, 0.9rem)',
            color: 'rgba(201,168,76,0.5)',
            letterSpacing: '0.45em',
          }}
        >
          ROZOZ
        </span>
      </motion.div>

      {/* ── INTRO BRAND REVEAL (0–4 s) ────────────────────────────────────── */}
      <AnimatePresence>
        {showIntroBrand && (
          <motion.div
            key="intro-brand"
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.5 } }}
            transition={{ duration: 1 }}
          >
            <motion.p
              style={{
                fontFamily: "'Amiri', 'Scheherazade New', serif",
                fontSize: 'clamp(4rem, 10vw, 9rem)',
                color: '#C9A84C',
                textShadow: '0 0 60px rgba(201,168,76,0.85), 0 0 120px rgba(201,168,76,0.4)',
                direction: 'rtl',
                lineHeight: 1,
              }}
              initial={{ scale: 0.85, opacity: 0, filter: 'blur(12px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              روزوز
            </motion.p>
            <motion.p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(0.8rem, 1.8vw, 1.5rem)',
                color: 'rgba(201,168,76,0.55)',
                letterSpacing: '0.55em',
                marginTop: '0.5rem',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
            >
              ROZOZ
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RKZ COVER OVERLAY (17.5–27 s) ────────────────────────────────── */}
      {/* Covers the original RKZ logo that appears on the KAFD tower in Clip 3.
          A dark panel + "روزوز" calligraphy replaces it frame-accurately.       */}
      <AnimatePresence>
        {showCoverRkz && (
          <motion.div
            key="cover-rkz"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          >
            {/* Dark backing panel – covers the building facade where RKZ appears */}
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Outer glow aura */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-40%',
                  background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.28) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />
              <p
                style={{
                  fontFamily: "'Amiri', 'Scheherazade New', serif",
                  fontSize: 'clamp(4.5rem, 11vw, 10rem)',
                  color: '#C9A84C',
                  textShadow: '0 0 50px rgba(201,168,76,1), 0 0 100px rgba(201,168,76,0.6)',
                  direction: 'rtl',
                  lineHeight: 1,
                }}
              >
                روزوز
              </p>
              <div
                style={{
                  height: '1px',
                  width: '60%',
                  background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
                  marginTop: '0.4rem',
                }}
              />
              <p
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 'clamp(0.75rem, 1.6vw, 1.3rem)',
                  color: 'rgba(201,168,76,0.6)',
                  letterSpacing: '0.5em',
                  marginTop: '0.4rem',
                }}
              >
                ROZOZ
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TECH-LABEL CLEAN-UP (27–37 s) ────────────────────────────────── */}
      {/* Semi-opaque panel over the lower half during Clip 4 (tech UI frames).
          Ensures no system labels, analysis text, or jargon remain visible.    */}
      <AnimatePresence>
        {showCleanTech && (
          <motion.div
            key="clean-tech"
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{ height: '55%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(to top, rgba(10,14,26,0.96) 40%, rgba(10,14,26,0.6) 75%, transparent 100%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OUTRO BRAND CLOSE (30–37 s) ──────────────────────────────────── */}
      <AnimatePresence>
        {showOutroBrand && (
          <motion.div
            key="outro-brand"
            className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <motion.p
              style={{
                fontFamily: "'Amiri', 'Scheherazade New', serif",
                fontSize: 'clamp(3rem, 7vw, 6.5rem)',
                color: '#C9A84C',
                textShadow: '0 0 40px rgba(201,168,76,0.8)',
                direction: 'rtl',
                lineHeight: 1,
              }}
              initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              روزوز
            </motion.p>

            <motion.div
              style={{
                height: '1px',
                width: 'clamp(120px, 20vw, 220px)',
                background: 'linear-gradient(to right, transparent, #C9A84C, transparent)',
                margin: '0.6rem 0',
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 0.6 }}
            />

            <motion.p
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: 'clamp(1rem, 2.4vw, 2rem)',
                color: 'rgba(245,240,232,0.85)',
                direction: 'rtl',
                letterSpacing: '0.05em',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.8 }}
            >
              حمّل تطبيق روزوز الآن
            </motion.p>

            <motion.p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(0.5rem, 1vw, 0.8rem)',
                color: 'rgba(201,168,76,0.4)',
                letterSpacing: '0.4em',
                marginTop: '0.4rem',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.1 }}
            >
              ROZOZ · وكيلك العقاري الحصري
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SAUDI ARDAH BACKGROUND MUSIC ─────────────────────────────────── */}
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
