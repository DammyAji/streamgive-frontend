import { useSyncExternalStore } from 'react';

// One shared one-second clock for every component that needs "now".
// A single interval runs while at least one subscriber exists, and it is
// paused while the tab is hidden.
const TICK_MS = 1000;

const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}

function start() {
  if (timer === null && !document.hidden) {
    tick();
    timer = setInterval(tick, TICK_MS);
  }
}

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function onVisibilityChange() {
  if (document.hidden) {
    stop();
  } else if (listeners.size > 0) {
    start();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

export function useSharedClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
