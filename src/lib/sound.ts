/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  Zero-Latency Notification Sound Utility (Web Audio API)                     ║
 * ║                                                                              ║
 * ║  Plays a crisp, modern, attention-grabbing chime whenever a new order       ║
 * ║  arrives.                                                                    ║
 * ║                                                                              ║
 * ║  PERFORMANCE & LATENCY ADVANTAGES:                                           ║
 * ║  ✅ 0ms network latency — synthesized directly by browser hardware audio    ║
 * ║  ✅ 0 byte file downloads — does NOT slow down API or order fetching        ║
 * ║  ✅ Non-blocking — executes entirely on native browser audio thread         ║
 * ║  ✅ Handles browser autoplay security policies gracefully                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  return audioCtx;
}

/**
 * Browsers require at least one user gesture before allowing audio playback.
 * This unlocks the AudioContext on first user interaction so sounds play instantly.
 */
function setupAudioUnlockListener() {
  if (typeof window === "undefined" || isAudioUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    } else {
      isAudioUnlocked = true;
    }

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true, once: true });
  window.addEventListener("keydown", unlock, { passive: true, once: true });
  window.addEventListener("touchstart", unlock, { passive: true, once: true });
}

// Set up unlock listener on initial module evaluation
if (typeof window !== "undefined") {
  setupAudioUnlockListener();
}

let lastSoundPlayTime = 0;
const SOUND_THROTTLE_MS = 3000;

/**
 * Plays an elegant, attention-grabbing 3-tone notification chime (G5 → B5 → E6)
 * indicating a new incoming order.
 *
 * Runs 100% asynchronously on the browser's native audio thread and NEVER blocks UI
 * or network operations.
 */
export function playNewOrderSound(): void {
  try {
    const nowMs = Date.now();
    // Guard against rapid duplicate triggers - strictly allow only 1 sound every 3 seconds
    if (nowMs - lastSoundPlayTime < SOUND_THROTTLE_MS) {
      return;
    }
    lastSoundPlayTime = nowMs;

    const ctx = getAudioContext();
    if (!ctx) return;

    // If context is suspended (due to autoplay policy), resume it
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume gain to keep chime crisp yet comfortable
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.32, now);
    masterGain.connect(ctx.destination);

    // Three rising bright harmonic tones: G5 (784Hz) -> B5 (988Hz) -> E6 (1319Hz)
    const notes = [
      { freq: 784.0, start: now, duration: 0.12 },
      { freq: 987.77, start: now + 0.09, duration: 0.12 },
      { freq: 1318.51, start: now + 0.18, duration: 0.45 },
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      // Smooth attack and natural exponential acoustic decay
      noteGain.gain.setValueAtTime(0.001, start);
      noteGain.gain.exponentialRampToValueAtTime(0.7, start + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });
  } catch (err) {
    // Fail silently so audio issues never affect order processing
    console.debug("[Audio] Notification sound skipped:", err);
  }
}
