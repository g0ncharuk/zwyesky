/* audio.js  –  handles preload + first-gesture playback */

let audioCtx = null; // created lazily
let arrayBuffer = null; // raw MP3 bytes
let decodedBuffer = null; // AudioBuffer after decode
let hasPlayed = false; // one-shot guard
let audioElement = null; // HTML5 audio element for mobile fallback
let usingAudioElement = false; // flag to track which method we're using

/*
 * 1. Pre-fetch the file as soon as the page loads
 *    (network warm-up, safe to do without a gesture)
 */
export async function initAudio() {
  if (arrayBuffer) return true; // already fetched

  // Create a hidden audio element as fallback method
  if (!audioElement) {
    audioElement = document.createElement('audio');
    audioElement.src = "./background.mp3";
    audioElement.preload = "auto";
    audioElement.loop = false;
    audioElement.style.display = "none";
    document.body.appendChild(audioElement);
  }

  try {
    const resp = await fetch("./background.mp3", { cache: "force-cache" });
    arrayBuffer = await resp.arrayBuffer();
    console.log("[audio] file prefetched");
    return true;
  } catch (err) {
    console.error("[audio] fetch failed:", err);
    return false;
  }
}

/*
 * 2. Call from a user gesture (click / touch / pointerup)
 *    Creates the AudioContext, decodes if needed, and starts playback.
 */
export async function playAudio() {
  if (hasPlayed) {
    console.log("[audio] already playing");
    return true;
  }

  // Try HTML5 Audio element first (better for mobile)
  try {
    if (audioElement) {
      console.log("[audio] attempting HTML5 audio playback");
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        hasPlayed = true;
        usingAudioElement = true;
        console.log("[audio] HTML5 audio playback started");
        return true;
      }
    }
  } catch (err) {
    console.warn("[audio] HTML5 audio failed, falling back to Web Audio API:", err);
  }

  // Fall back to Web Audio API
  if (!arrayBuffer) {
    console.warn("[audio] audio not prefetched yet");
    return false;
  }

  try {
    /* 2-a  Create the context AFTER the gesture */
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();

    /* 2-b  Safari-specific: resume a suspended context */
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    /* 2-c  Decode only once */
    decodedBuffer ??= await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    /* 2-d  Fire it up */
    const src = audioCtx.createBufferSource();
    src.buffer = decodedBuffer;
    src.connect(audioCtx.destination);
    src.loop = false; // no looping
    src.start();

    hasPlayed = true;
    console.log("[audio] Web Audio API playback started");
    return true;
  } catch (err) {
    console.error("[audio] playback error:", err);
    return false;
  }
}

/*
 * 3. Wire the overlay + button to the gesture-safe playAudio()
 */
export function setupAudioPrompt() {
  const prompt = document.getElementById("audioPrompt");
  const button = document.getElementById("playAudioButton");
  if (!prompt || !button) return;

  /* helper that hides the overlay on success */
  async function tryPlay(e) {
    e.preventDefault();
    if (await playAudio()) {
      prompt.classList.add("hidden");
    }
  }

  /* Mobile-friendly approach - add multiple event types */
  ["pointerup", "click", "touchend"].forEach((ev) => {
    button.addEventListener(ev, tryPlay);
    prompt.addEventListener(ev, tryPlay);
  });

  /* safety net – any first document interaction */
  document.addEventListener("pointerup", tryPlay, {
    once: true,
    capture: true,
  });
  
  document.addEventListener("touchend", tryPlay, {
    once: true,
    capture: true,
  });
}
