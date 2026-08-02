// ============================================================
// pomodoro.js
// シンプルな25分ポモドーロタイマー(端末固有の状態のためGAS同期しない)
// ============================================================

const DEFAULT_SECONDS = 25 * 60;
const els = {};

let remaining = DEFAULT_SECONDS;
let intervalId = null;
let isRunning = false;

export function initPomodoroModule() {
  els.display = document.getElementById('pomodoro-display');
  els.startBtn = document.getElementById('pomodoro-start');
  els.resetBtn = document.getElementById('pomodoro-reset');

  els.startBtn.addEventListener('click', toggleStartPause);
  els.resetBtn.addEventListener('click', reset);

  updateDisplay();
}

function toggleStartPause() {
  if (isRunning) {
    pause();
  } else {
    start();
  }
}

function start() {
  isRunning = true;
  els.startBtn.textContent = '一時停止';
  intervalId = setInterval(tick, 1000);
}

function pause() {
  isRunning = false;
  els.startBtn.textContent = '開始';
  clearInterval(intervalId);
}

function reset() {
  pause();
  remaining = DEFAULT_SECONDS;
  updateDisplay();
}

function tick() {
  remaining -= 1;
  if (remaining <= 0) {
    remaining = 0;
    pause();
    playBeep();
    els.display.classList.add('is-finished');
    setTimeout(() => els.display.classList.remove('is-finished'), 3000);
  }
  updateDisplay();
}

function updateDisplay() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  els.display.textContent = `${m}:${s}`;
}

/** 外部音源ファイルを持たず、Web Audio APIで簡易ビープ音を鳴らす */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('[pomodoro] beep failed', e);
  }
}
