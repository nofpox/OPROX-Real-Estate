import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';

const TOTAL_DURATION_MS = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

// ─── Recording state machine ────────────────────────────────────────────────
type RecordState = 'idle' | 'awaiting' | 'recording' | 'processing' | 'done';

// ─── Recording overlay ──────────────────────────────────────────────────────
function RecordingOverlay({ state }: { state: RecordState }) {
  if (state !== 'recording' && state !== 'processing') return null;
  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-white text-sm font-medium">
        {state === 'recording' ? 'جارٍ تسجيل الفيلم…' : 'جارٍ الحفظ…'}
      </span>
    </div>
  );
}

// ─── Download button ────────────────────────────────────────────────────────
function RecordButton({ state, onClick }: { state: RecordState; onClick: () => void }) {
  const label: Record<RecordState, string> = {
    idle:       'تحميل الفيلم',
    awaiting:   'انتظر المتصفح…',
    recording:  'جارٍ التسجيل…',
    processing: 'جارٍ الحفظ…',
    done:       'تحميل مرة أخرى',
  };
  const isDisabled = state === 'awaiting' || state === 'recording' || state === 'processing';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all shrink-0
        ${state === 'recording'
          ? 'bg-red-500/80 text-white animate-pulse'
          : state === 'processing' || state === 'awaiting'
          ? 'bg-white/10 text-white/50 cursor-not-allowed'
          : 'bg-amber-500 hover:bg-amber-400 text-gray-900 cursor-pointer'
        }`}
      style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}
    >
      {(state === 'recording' || state === 'processing' || state === 'awaiting')
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Download className="w-4 h-4" />
      }
      <span className="hidden sm:inline">{label[state]}</span>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function VideoWithControls() {
  const [muted, setMuted]           = useState(true);
  const [hovering, setHovering]     = useState(false);
  const [recordState, setRecordState] = useState<RecordState>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensorRef        = useRef<HTMLDivElement | null>(null);

  const [elapsed, setElapsed]   = useState(0);
  const elapsedRef              = useRef(0);
  const filmTimerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start a local progress ticker once we know the film is playing
  useEffect(() => {
    if (filmTimerRef.current) clearInterval(filmTimerRef.current);
    elapsedRef.current = 0;
    setElapsed(0);
    const start = performance.now();
    filmTimerRef.current = setInterval(() => {
      const e = performance.now() - start;
      elapsedRef.current = e;
      setElapsed(e);
    }, 80);
    return () => {
      if (filmTimerRef.current) clearInterval(filmTimerRef.current);
    };
  }, []);

  const progress = Math.min(1, elapsed / TOTAL_DURATION_MS);

  // ─── Record & download ─────────────────────────────────────────────────
  const stopAndDownload = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    setRecordState('processing');
    mr.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setRecordState('awaiting');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        // @ts-expect-error non-standard hint
        selfBrowserSurface: 'include',
        preferCurrentTab: true,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'rozoz-promotional-film.webm';
        a.click();
        URL.revokeObjectURL(url);
        setRecordState('done');
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      };

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mr.state !== 'inactive') mr.stop();
        setRecordState('idle');
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      });

      mr.start(200);
      setRecordState('recording');
      // Reset progress
      elapsedRef.current = 0;
      setElapsed(0);
      recordTimerRef.current = setTimeout(stopAndDownload, TOTAL_DURATION_MS + 1500);
    } catch {
      setRecordState('idle');
    }
  }, [stopAndDownload]);

  const handleStartRecord = useCallback(() => {
    if (recordState === 'idle' || recordState === 'done') startRecording();
  }, [recordState, startRecording]);

  useEffect(() => () => {
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const barVisible = hovering || recordState === 'recording';

  return (
    <div
      className="relative w-full h-screen"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <VideoTemplate muted={muted} loop={recordState !== 'recording'} />

      <RecordingOverlay state={recordState} />

      {/* ── Control bar (hover to reveal) ──────────────────────────────── */}
      <div
        ref={sensorRef}
        className={`absolute bottom-0 left-0 right-0 z-50 flex flex-col transition-all duration-300 ease-out ${
          barVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="mx-5 mb-1 h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3 bg-black/55 backdrop-blur-sm px-5 py-4" dir="rtl">
          {/* Mute music toggle */}
          <button
            onClick={() => setMuted((m) => !m)}
            className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
              muted
                ? 'text-white/55 hover:text-white hover:bg-white/10'
                : 'text-white bg-white/15 hover:bg-white/25'
            }`}
            title={muted ? 'تشغيل الموسيقى' : 'كتم الموسيقى'}
          >
            {muted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Film duration label */}
          <span
            className="text-white/45 text-sm tabular-nums"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {Math.floor((TOTAL_DURATION_MS - elapsed) / 1000)} ث
          </span>

          {/* Download button */}
          <RecordButton state={recordState} onClick={handleStartRecord} />
        </div>
      </div>
    </div>
  );
}
