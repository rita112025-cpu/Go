// Web Audio cues for the game clock. All sounds are synthesized; nothing is loaded.
(function (root) {
  'use strict';
  let ctx = null;

  function audio() {
    if (!ctx) ctx = new (root.AudioContext || root.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, volume, duration, type) {
    try {
      const a = audio();
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
      osc.stop(a.currentTime + duration);
    } catch (e) {
      // Audio is optional; browsers may block it before the first user gesture.
    }
  }

  const GoSound = {
    tick: (freq, volume) => tone(freq, volume, 0.2, 'sine'),
    // Two quick beeps for the last five seconds.
    doubleTick(spacingMs, volume) {
      tone(1200, volume, 0.2, 'sine');
      setTimeout(() => tone(1200, volume, 0.2, 'sine'), spacingMs);
    },
    drum: () => tone(180, 0.3, 0.25, 'triangle'),
    timeout: () => tone(400, 0.3, 1.2, 'sawtooth'),
  };

  // Countdown cue for a whole second just reached, matching the original timings.
  GoSound.countdown = function (seconds, inByo) {
    if (inByo) {
      if (seconds >= 6 && seconds <= 10) GoSound.tick(800, 0.15);
      else if (seconds >= 1 && seconds <= 5) GoSound.doubleTick(120, 0.12);
    } else if (seconds >= 1 && seconds <= 10) {
      if (seconds <= 5) GoSound.doubleTick(100, 0.12);
      else GoSound.tick(800, 0.1);
    }
  };

  root.GoSound = GoSound;
})(window);
