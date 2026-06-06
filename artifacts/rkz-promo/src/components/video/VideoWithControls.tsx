import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Loader2, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;
const TOTAL_DURATION_MS = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

// ─── Recording state machine ───────────────────────────────────────────────
type RecordState = 'idle' | 'awaiting' | 'recording' | 'processing' | 'done';

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  muted: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  recordState: RecordState;
  onToggleLock: () => void;
  onToggleMute: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
  onStartRecord: () => void;
}

function ProgressSegments({
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start);
    }, PROGRESS_TICK_MS);
    return () => window.clearInterval(id);
  }, [tick]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;

  return (
    <div className="flex-1 flex items-center gap-1.5">
      {sceneKeys.map((key, i) => {
        const isActive = i === activeIndex;
        const fill = isActive ? progress * 100 : 0;
        return (
          <button
            key={key}
            onClick={() => onJumpTo(i)}
            className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-4 hover:bg-white/25 transition-all relative min-h-[12px]"
            aria-label={`Jump to scene ${i + 1}`}
            aria-current={isActive ? 'true' : undefined}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/90 rounded-full transition-[width] duration-100"
              style={{ width: `${fill}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

function RecordButton({ state, onClick }: { state: RecordState; onClick: () => void }) {
  const label: Record<RecordState, string> = {
    idle: 'Download Video',
    awaiting: 'Allow tab capture…',
    recording: 'Recording…',
    processing: 'Saving…',
    done: 'Download Again',
  };

  const isDisabled = state === 'awaiting' || state === 'recording' || state === 'processing';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0
        ${state === 'recording'
          ? 'bg-red-500/80 text-white animate-pulse'
          : state === 'processing'
          ? 'bg-white/10 text-white/50 cursor-not-allowed'
          : state === 'awaiting'
          ? 'bg-white/10 text-white/60 cursor-wait'
          : 'bg-amber-500 hover:bg-amber-400 text-gray-900 cursor-pointer'
        }`}
      title={label[state]}
    >
      {(state === 'recording' || state === 'processing' || state === 'awaiting') ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{label[state]}</span>
    </button>
  );
}

function ControlBar({
  visible,
  collapsed,
  locked,
  muted,
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  recordState,
  onToggleLock,
  onToggleMute,
  onJumpTo,
  onToggleCollapsed,
  onStartRecord,
}: ControlBarProps) {
  return (
    <div
      className={`flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-4 transition-all duration-200 ease-out ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        onClick={onToggleLock}
        className={`w-14 h-14 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          locked
            ? 'text-white bg-white/15 hover:bg-white/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-pressed={locked}
      >
        <Repeat className="w-8 h-8" />
      </button>

      <button
        onClick={onToggleMute}
        className={`w-14 h-14 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          muted
            ? 'text-white/60 hover:text-white hover:bg-white/10'
            : 'text-white bg-white/15 hover:bg-white/25'
        }`}
        title={muted ? 'Unmute audio' : 'Mute audio'}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        aria-pressed={!muted}
      >
        {muted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
      </button>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <ProgressSegments
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        tick={tick}
        onJumpTo={onJumpTo}
      />

      <div className="text-xl text-white/60 font-mono tabular-nums shrink-0">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      <RecordButton state={recordState} onClick={onStartRecord} />

      <button
        onClick={onToggleCollapsed}
        className="w-14 h-14 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title={collapsed ? 'Show controls' : 'Hide controls'}
        aria-label={collapsed ? 'Show controls' : 'Hide controls'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronUp className="w-10 h-10" /> : <ChevronDown className="w-10 h-10" />}
      </button>
    </div>
  );
}

// ─── Recording overlay ─────────────────────────────────────────────────────
function RecordingOverlay({ state }: { state: RecordState }) {
  if (state !== 'recording' && state !== 'processing') return null;
  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-white text-sm font-medium">
        {state === 'recording' ? 'Recording video…' : 'Saving file…'}
      </span>
    </div>
  );
}

// ─── How-to modal ──────────────────────────────────────────────────────────
function HowToModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-white font-bold text-xl mb-2">Download Promotional Film</h2>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          Click <strong className="text-amber-400">Download Video</strong> and your browser will
          ask you to share <strong className="text-white">This Tab</strong>.
          Select it and click <strong className="text-white">Share</strong> — the film plays
          through once automatically, then the file downloads to your device.
        </p>
        <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2 text-sm text-white/50">
          <div className="flex gap-2"><span className="text-amber-400">1.</span><span>Click <em>Download Video</em> below</span></div>
          <div className="flex gap-2"><span className="text-amber-400">2.</span><span>Choose <em>This Tab</em> in the browser dialog</span></div>
          <div className="flex gap-2"><span className="text-amber-400">3.</span><span>Click <em>Share</em></span></div>
          <div className="flex gap-2"><span className="text-amber-400">4.</span><span>Film plays once — file downloads automatically</span></div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold transition-colors text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function VideoWithControls() {
  const {
    sceneKeys,
    activeIndex,
    locked,
    mountKey,
    tick,
    durations,
    activeDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
  } = useSceneControls(SCENE_DURATIONS);

  const [muted, setMuted] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);

  // Recording state
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [showModal, setShowModal] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    if (collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      if (!c) { setHovering(false); setTapPinned(false); }
      return !c;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(e.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [collapsed, tapPinned]);

  // ─── Record & download ───────────────────────────────────────────────────
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
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rkz-promotional-film.webm';
        a.click();
        URL.revokeObjectURL(url);
        setRecordState('done');
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      };

      // User may have cancelled the share dialog
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mr.state !== 'inactive') mr.stop();
        setRecordState('idle');
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      });

      mr.start(200); // collect data every 200ms
      setRecordState('recording');

      // Jump to scene 0 so we always record from the very beginning
      jumpTo(0);

      // Auto-stop after the full video duration + 1s buffer
      recordTimerRef.current = setTimeout(stopAndDownload, TOTAL_DURATION_MS + 1000);
    } catch {
      // User cancelled or browser denied
      setRecordState('idle');
    }
  }, [jumpTo, stopAndDownload]);

  const handleStartRecord = useCallback(() => {
    if (recordState === 'idle' || recordState === 'done') {
      startRecording();
    }
  }, [recordState, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const barVisible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative w-full h-screen">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop={recordState !== 'recording'}
        muted={muted}
        onSceneChange={onSceneChange}
      />

      <RecordingOverlay state={recordState} />
      {showModal && <HowToModal onClose={() => setShowModal(false)} />}

      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="flex-1 w-full" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={locked}
          muted={muted}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          tick={tick}
          recordState={recordState}
          onToggleLock={toggleLock}
          onToggleMute={() => setMuted((m) => !m)}
          onJumpTo={jumpTo}
          onToggleCollapsed={handleToggleCollapsed}
          onStartRecord={handleStartRecord}
        />
      </div>
    </div>
  );
}
