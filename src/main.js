import "./style.css";

const innerWidth = window.innerWidth;
const isMobile = innerWidth <= 768;

let audioContext;
let audioBuffer;
let audioSource;
let audioLoaded = false;

async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch("/background.mp3");
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioLoaded = true;
  } catch (error) {
    console.error("Error loading audio:", error);
  }
}

function playAudioOnce() {
  if (!audioContext || !audioLoaded) return;

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(audioContext.destination);
  audioSource.start(0);
}

const opacityAnimation = {
  delay: 3000,
  duration: 4000,
  from: 0.0,
  to: 1.0,
};

const overlayXAnimetion = {
  delay: 5000,
  duration: 2000,
  from: 0.0,
  to: 1.0,
};
const overlayYAnimetion = {
  delay: 5000,
  duration: 2000,
  from: 0.8,
  to: 1.0,
};

const cellStrokeAnimUp = isMobile
  ? {
      strokeFrom: 1,
      strokeTo: 15,
    }
  : {
      strokeFrom: 1,
      strokeTo: 20,
    };

const cellStrokeAnimDown = isMobile
  ? {
      strokeFrom: 15,
      strokeTo: 1,
    }
  : {
      strokeFrom: 20,
      strokeTo: 1,
    };

const CONFIG = {
  rows: 3,
  trianglesPerRow: 7,
  triangleWidth: isMobile ? innerWidth - 30 : 750,
  centerSelectedCell: { row: 1, col: 3 },
  defaultAnimation: {
    color: "#BEC2CB",
    triangleCount: 4,
    delay: 1000,
    duration: 4000,
    strokeFrom: 80,
    strokeTo: 2,
    sizeFrom: 0.01,
    sizeTo: 1.1,
    offset: 300,
  },
  specialTriangles: [
    { row: 0, col: 0, opacityAnimation, ...cellStrokeAnimDown },
    { row: 0, col: 1, opacityAnimation, ...cellStrokeAnimUp },
    { row: 0, col: 2, opacityAnimation, ...cellStrokeAnimDown },
    { row: 0, col: 3, opacityAnimation, ...cellStrokeAnimUp },
    { row: 0, col: 4, opacityAnimation, ...cellStrokeAnimDown },
    { row: 0, col: 5, opacityAnimation, ...cellStrokeAnimUp },
    { row: 0, col: 6, opacityAnimation, ...cellStrokeAnimDown },

    { row: 1, col: 0, opacityAnimation, ...cellStrokeAnimUp },
    { row: 1, col: 1, opacityAnimation, ...cellStrokeAnimDown },
    { row: 1, col: 2, opacityAnimation, ...cellStrokeAnimUp },

    { row: 1, col: 3, ...cellStrokeAnimDown },

    { row: 1, col: 4, opacityAnimation, ...cellStrokeAnimUp },
    { row: 1, col: 5, opacityAnimation, ...cellStrokeAnimDown },
    { row: 1, col: 6, opacityAnimation, ...cellStrokeAnimUp },

    { row: 2, col: 0, opacityAnimation, ...cellStrokeAnimDown },
    { row: 2, col: 1, opacityAnimation, ...cellStrokeAnimUp },
    { row: 2, col: 2, opacityAnimation, ...cellStrokeAnimDown },
    { row: 2, col: 3, opacityAnimation, ...cellStrokeAnimUp },
    { row: 2, col: 4, opacityAnimation, ...cellStrokeAnimDown },
    { row: 2, col: 5, opacityAnimation, ...cellStrokeAnimUp },
    { row: 2, col: 6, opacityAnimation, ...cellStrokeAnimDown },
  ],
  fps: 60,
};

const TRIANGLE_WIDTH = CONFIG.triangleWidth;
const TRIANGLE_HEIGHT = TRIANGLE_WIDTH * 0.866;

let CELLS = [];
let canvas, ctx;
let startTime = 0;
let lastFrameTime = 0;

let bottomOverlay, leftOverlay, rightOverlay;

function createCells() {
  CELLS = [];
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.trianglesPerRow; c++) {
      const special = CONFIG.specialTriangles.find(
        (sp) => sp.row === r && sp.col === c
      );
      const cellConfig = { ...CONFIG.defaultAnimation, ...(special || {}) };

      const rowIsEven1Based = (r + 1) % 2 === 0;
      const colIsEven1Based = (c + 1) % 2 === 0;

      let pointingDown;
      if (rowIsEven1Based) {
        pointingDown = !colIsEven1Based;
      } else {
        pointingDown = colIsEven1Based;
      }

      const x = c * (TRIANGLE_WIDTH / 2);
      const y = r * TRIANGLE_HEIGHT;

      let corners;
      if (pointingDown) {
        corners = [
          [x + TRIANGLE_WIDTH * 0.5, y + TRIANGLE_HEIGHT],
          [x, y],
          [x + TRIANGLE_WIDTH, y],
        ];
      } else {
        corners = [
          [x + TRIANGLE_WIDTH * 0.5, y],
          [x, y + TRIANGLE_HEIGHT],
          [x + TRIANGLE_WIDTH, y + TRIANGLE_HEIGHT],
        ];
      }

      const subTriangles = [];
      for (let i = 0; i < cellConfig.triangleCount; i++) {
        subTriangles.push({ delayOffset: i * cellConfig.delay });
      }

      CELLS.push({
        row: r,
        col: c,
        corners,
        config: cellConfig,
        subTriangles,
      });
    }
  }

  centerSelectedCell(
    CONFIG.centerSelectedCell.row,
    CONFIG.centerSelectedCell.col
  );
}

function centerSelectedCell(targetRow, targetCol) {
  const centerCell = CELLS.find(
    (cell) => cell.row === targetRow && cell.col === targetCol
  );
  if (!centerCell) return;

  const [p1, p2, p3] = centerCell.corners;
  const cx = (p1[0] + p2[0] + p3[0]) / 3;
  const cy = (p1[1] + p2[1] + p3[1]) / 3;

  const desiredX = canvas.width / 2;
  const desiredY = canvas.height / 2;

  const offsetX = desiredX - cx;
  const offsetY = desiredY - cy;

  CELLS.forEach((cell) => {
    cell.corners = cell.corners.map(([xx, yy]) => [xx + offsetX, yy + offsetY]);
  });
}

function drawCell(cell, elapsed) {
  const { corners, config, subTriangles } = cell;
  const [p1, p2, p3] = corners;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p3[0], p3[1]);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = "black";
  ctx.fillRect(
    Math.min(p1[0], p2[0], p3[0]) - 2,
    Math.min(p1[1], p2[1], p3[1]) - 2,
    TRIANGLE_WIDTH + 4,
    TRIANGLE_HEIGHT + 4
  );

  let alpha = 1;
  if (config.opacityAnimation) {
    const {
      delay = 0,
      duration = 0,
      from = 0.0,
      to = 1.0,
    } = config.opacityAnimation;

    const fadeElapsed = elapsed + (config.offset || 0) - delay;

    if (fadeElapsed <= 0) {
      alpha = from;
    } else if (duration <= 0 || fadeElapsed >= duration) {
      alpha = to;
    } else {
      const t = fadeElapsed / duration;
      alpha = from + t * (to - from);
    }
  }

  const cx = (p1[0] + p2[0] + p3[0]) / 3;
  const cy = (p1[1] + p2[1] + p3[1]) / 3;

  for (let st of subTriangles) {
    const effectiveElapsed = elapsed + (config.offset || 0) - st.delayOffset;
    if (effectiveElapsed < 0) continue;

    const progress = (effectiveElapsed % config.duration) / config.duration;
    const strokeW =
      config.strokeFrom + progress * (config.strokeTo - config.strokeFrom);
    const size = config.sizeFrom + progress * (config.sizeTo - config.sizeFrom);

    const x1 = cx + (p1[0] - cx) * size;
    const y1 = cy + (p1[1] - cy) * size;
    const x2 = cx + (p2[0] - cx) * size;
    const y2 = cy + (p2[1] - cy) * size;
    const x3 = cx + (p3[0] - cx) * size;
    const y3 = cy + (p3[1] - cy) * size;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = config.color;
    ctx.stroke();
  }

  ctx.restore();
}

function updateYOverlays(elapsed) {
  const { delay, duration, from, to } = overlayYAnimetion;
  let alpha = 1;

  const fadeElapsed = elapsed - delay;
  if (fadeElapsed <= 0) {
    alpha = from;
  } else if (fadeElapsed >= duration) {
    alpha = to;
  } else {
    const t = fadeElapsed / duration;
    alpha = from + t * (to - from);
  }

  bottomOverlay.style.opacity = alpha;
}

function updateXOverlays(elapsed) {
  const { delay, duration, from, to } = overlayXAnimetion;
  let alpha = 1;

  const fadeElapsed = elapsed - delay;
  if (fadeElapsed <= 0) {
    alpha = from;
  } else if (fadeElapsed >= duration) {
    alpha = to;
  } else {
    const t = fadeElapsed / duration;
    alpha = from + t * (to - from);
  }

  leftOverlay.style.opacity = alpha;
  rightOverlay.style.opacity = alpha;
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  const frameInterval = 1000 / CONFIG.fps;
  if (!lastFrameTime) lastFrameTime = timestamp;
  if (timestamp - lastFrameTime < frameInterval) return;
  lastFrameTime = timestamp;

  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let cell of CELLS) {
    drawCell(cell, elapsed);
  }

  updateYOverlays(elapsed);
  updateXOverlays(elapsed);
}

function onResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createCells();
  startTime = 0;
  lastFrameTime = 0;
}

function init() {
  canvas = document.getElementById("triangleCanvas");
  ctx = canvas.getContext("2d");

  bottomOverlay = document.querySelector(".bottom-overflow");
  leftOverlay = document.querySelector(".left-overflow");
  rightOverlay = document.querySelector(".right-overflow");

  onResize();
  requestAnimationFrame(animate);

  window.addEventListener("resize", onResize);

  initAudio().then(() => {
    const audioPrompt = document.getElementById("audioPrompt");
    try {
      playAudioOnce();
      audioPrompt.classList.add("hidden");
    } catch (e) {
      audioPrompt.style.pointerEvents = "auto";
      canvas.addEventListener(
        "click",
        () => {
          playAudioOnce();
          audioPrompt.classList.add("hidden");
        },
        { once: true }
      );

      document.addEventListener(
        "click",
        () => {
          playAudioOnce();
          audioPrompt.classList.add("hidden");
        },
        { once: true }
      );
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
