import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';

export const SCENE_DURATIONS: Record<string, number> = {
  atmosphere_desert: 8000,
  atmosphere_city:   8000,
  ai_engine:         7000,
  brand_close:       8000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  atmosphere_desert: Scene1,
  atmosphere_city:   Scene2,
  ai_engine:         Scene3,
  brand_close:       Scene4,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

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
  const { currentSceneKey } = useVideoPlayer({ durations, loop });
  const musicRef    = useRef<HTMLAudioElement | null>(null);
  const voiceRef    = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex   = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    music.volume = 0.35;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(music.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      music.currentTime = targetTime;
    }
    music.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey]);

  useEffect(() => {
    const voice = voiceRef.current;
    if (!voice) return;
    voice.volume = 1;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(voice.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      voice.currentTime = targetTime;
    }
    voice.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.muted = muted;
    if (voiceRef.current) voiceRef.current.muted = muted;
  }, [muted]);

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* Scene-transition gold line */}
      <motion.div
        className="absolute top-1/2 left-0 h-[1px] bg-primary z-50 pointer-events-none"
        animate={{
          width: ['0%', '100%', '0%', '100%'][sceneIndex % 4],
          left:  ['0%', '0%', '100%', '0%'][sceneIndex % 4],
          opacity: sceneIndex === 3 ? 0 : 0.4,
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      {/* Background music */}
      <audio
        ref={musicRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        loop
        muted={muted}
      />

      {/* English voiceover */}
      <audio
        ref={voiceRef}
        src={`${import.meta.env.BASE_URL}audio/voiceover.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
