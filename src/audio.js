let audioCtx = null;
let arrayBuffer = null;
let decodedBuffer = null;
let hasPlayed = false;
let audioElement = null;
let usingAudioElement = false;

export async function initAudio() {
  if (arrayBuffer) return true;

  if (!audioElement) {
    audioElement = document.createElement("audio");
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

export async function playAudio() {
  if (hasPlayed) {
    console.log("[audio] already playing");
    return true;
  }

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
    console.warn(
      "[audio] HTML5 audio failed, falling back to Web Audio API:",
      err
    );
  }

  if (!arrayBuffer) {
    console.warn("[audio] audio not prefetched yet");
    return false;
  }

  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    decodedBuffer ??= await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const src = audioCtx.createBufferSource();
    src.buffer = decodedBuffer;
    src.connect(audioCtx.destination);
    src.loop = false;
    src.start();

    hasPlayed = true;
    console.log("[audio] Web Audio API playback started");
    return true;
  } catch (err) {
    console.error("[audio] playback error:", err);
    return false;
  }
}

export function setupAudioPrompt(startAnimationCallback) {
  const audioPrompt = document.getElementById('audioPrompt');

  if (audioPrompt) {
    audioPrompt.addEventListener('click', () => {
      // Start audio
      playAudio();
      
      // Hide the prompt
      audioPrompt.style.display = 'none';
      
      // Start animation
      if (startAnimationCallback) {
        startAnimationCallback();
      }
    });
  }
}
