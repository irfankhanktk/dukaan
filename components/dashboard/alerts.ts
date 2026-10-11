"use client";

/**
 * New-order sound alerts. The beep is generated with the Web Audio API (no audio file).
 * Browsers only allow audio after a user gesture, so the shopkeeper turns alerts on once
 * (remembered in localStorage) and we "unlock" the AudioContext on the first tap of each visit.
 */

const SOUND_KEY = "dukaan:sound-alerts";
const PROMPT_KEY = "dukaan:sound-prompt-dismissed";
const EVENT = "dukaan:alerts-change";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage: setting just won't be remembered.
  }
}

// --- external store for useSyncExternalStore -------------------------------------------

export type AlertPrefs = { sound: boolean; promptDismissed: boolean };
const SERVER_PREFS: AlertPrefs = { sound: false, promptDismissed: true };
let cached: AlertPrefs | null = null;

export function getAlertPrefs(): AlertPrefs {
  const sound = read(SOUND_KEY) === "on";
  const promptDismissed = read(PROMPT_KEY) === "1";
  if (!cached || cached.sound !== sound || cached.promptDismissed !== promptDismissed) {
    cached = { sound, promptDismissed };
  }
  return cached;
}

export function getServerAlertPrefs(): AlertPrefs {
  return SERVER_PREFS;
}

export function subscribeAlertPrefs(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

export function dismissSoundPrompt() {
  write(PROMPT_KEY, "1");
  notify();
}

/** Call from a click handler (user gesture). */
export function setSoundAlerts(on: boolean) {
  write(SOUND_KEY, on ? "on" : "off");
  write(PROMPT_KEY, "1");
  if (on) {
    unlockAudio();
    playAlert();
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }
  notify();
}

// --- audio -----------------------------------------------------------------------------

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Create/resume the AudioContext. Must run inside a user gesture to succeed. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

function tone(c: AudioContext, freq: number, start: number, duration: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** A friendly two-tone "ding-dong", three times. */
export function playAlert() {
  const c = getCtx();
  if (!c) return;
  const play = () => {
    const t = c.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const base = t + i * 0.7;
      tone(c, 880, base, 0.25);
      tone(c, 660, base + 0.25, 0.35);
    }
  };
  if (c.state === "suspended") {
    c.resume().then(play).catch(() => {});
  } else {
    play();
  }
}
