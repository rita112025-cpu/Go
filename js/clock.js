// Japanese byo-yomi game clock: main time, then a number of fixed-length periods.
(function (root) {
  'use strict';

  const PRESETS = {
    fast: { label: '快棋 5分+3x30秒', mainMinutes: 5, periods: 3, periodSeconds: 30 },
    medium: { label: '中速 15分+5x40秒', mainMinutes: 15, periods: 5, periodSeconds: 40 },
    long: { label: '長考 30分+5x60秒', mainMinutes: 30, periods: 5, periodSeconds: 60 },
  };
  const TICK = 0.1;

  function createClock(settings) {
    return { main: settings.mainMinutes * 60, byoLeft: settings.periods, byoTime: settings.periodSeconds, inByo: false };
  }
  function createClocks(settings) {
    return { black: createClock(settings), white: createClock(settings) };
  }
  const remaining = (clock) => (clock.inByo ? clock.byoTime : clock.main);

  // Advances one tick. Returns a new clock plus what happened, so the caller can
  // play sounds and end the game without this module knowing about either.
  function tick(clock, settings) {
    const next = { ...clock };
    const before = Math.ceil(remaining(next));
    let enteredPeriod = false, timeout = false;
    if (!next.inByo) {
      next.main = Math.max(0, next.main - TICK);
      if (next.main <= 0) {
        next.inByo = true;
        next.byoTime = settings.periodSeconds;
        enteredPeriod = true;
      }
    } else {
      next.byoTime = Math.max(0, next.byoTime - TICK);
      if (next.byoTime <= 0) {
        next.byoLeft -= 1;
        if (next.byoLeft < 0) timeout = true;
        else {
          next.byoTime = settings.periodSeconds;
          enteredPeriod = true;
        }
      }
    }
    const after = Math.ceil(remaining(next));
    return { clock: next, enteredPeriod, timeout, secondChanged: before !== after, seconds: after };
  }

  // A move made during byo-yomi refills the current period.
  function afterMove(clock, settings) {
    return clock.inByo ? { ...clock, byoTime: settings.periodSeconds } : { ...clock };
  }

  function formatMain(clock, enabled) {
    if (!enabled) return '--:--';
    if (clock.inByo) return '00:00';
    const m = Math.floor(clock.main / 60);
    const s = Math.floor(clock.main % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function describe(clock, settings) {
    if (!clock.inByo) return `保留 ${clock.byoLeft} 期`;
    return `讀秒 ${settings.periods - clock.byoLeft + 1}/${settings.periods} · ${Math.ceil(clock.byoTime)}秒`;
  }
  // Fraction of the current time bucket left, for the progress bar.
  function fraction(clock, settings) {
    return clock.inByo ? clock.byoTime / settings.periodSeconds : clock.main / (settings.mainMinutes * 60);
  }

  root.GoClock = { PRESETS, TICK, createClocks, remaining, tick, afterMove, formatMain, describe, fraction };
})(window);
