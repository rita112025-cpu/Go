// Main 19x19 game: player (black) vs ranked AI (white) with byo-yomi clocks,
// timing stats, influence overlay and move-by-move review.
(function () {
  'use strict';
  const G = window.GoEngine;
  const AI = window.GoAI;
  const Clock = window.GoClock;
  const Sound = window.GoSound;
  const { EMPTY, BLACK, WHITE } = G;

  const SIZE = 19;
  const KOMI = 6.5;
  const STAR_POINTS = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
  const COLS = 'ABCDEFGHJKLMNOPQRST';
  const pct = (i) => (i / (SIZE - 1)) * 100 + '%';
  const colorKey = (c) => (c === BLACK ? 'black' : 'white');
  const $ = (id) => document.getElementById(id);

  // Each history entry is the position *after* a move, plus the clocks at that
  // moment, so undo and review restore the board and time together.
  const state = {
    settings: { preset: 'fast', enabled: true, ...Clock.PRESETS.fast },
    level: 5,
    showInfluence: false,
    paused: false,
    sound: true,
    review: null,
    aiThinking: false,
    message: '初手佈局，請多指教',
    over: false,
    winner: null,
    resultText: '',
    passes: 0,
    history: [],
    turnStartedAt: Date.now(),
    gameId: 0,
  };

  function initialEntry() {
    return {
      board: G.createBoard(SIZE), player: BLACK, lastMove: null, capturedB: 0, capturedW: 0,
      clocks: Clock.createClocks(state.settings), ko: null, thinkTime: 0, moveNum: 0,
    };
  }
  const latest = () => state.history[state.history.length - 1];
  const shown = () => (state.review !== null ? state.history[state.review] : latest());

  // ---------- Game actions ----------
  function nextEntry(prev, patch) {
    const mover = colorKey(prev.player);
    return {
      board: prev.board, player: G.other(prev.player), lastMove: null,
      capturedB: prev.capturedB, capturedW: prev.capturedW,
      clocks: { ...prev.clocks, [mover]: Clock.afterMove(prev.clocks[mover], state.settings) },
      ko: null, thinkTime: (Date.now() - state.turnStartedAt) / 1000, moveNum: prev.moveNum + 1, captureCount: 0,
      ...patch,
    };
  }
  function pushEntry(entry) {
    state.history.push(entry);
    state.turnStartedAt = Date.now();
  }
  function playStone(x, y, color, intent) {
    const prev = latest();
    const r = G.play(prev.board, x, y, color, prev.ko);
    if (!r.legal) return r;
    const n = r.captured.length;
    pushEntry(nextEntry(prev, {
      board: r.board, lastMove: [x, y], ko: r.ko, captureCount: n, intent,
      capturedB: prev.capturedB + (color === BLACK ? n : 0),
      capturedW: prev.capturedW + (color === WHITE ? n : 0),
    }));
    state.passes = 0;
    return r;
  }
  const canPlayerAct = () => !state.over && !state.paused && state.review === null && latest().player === BLACK;

  function onBoardClick(x, y) {
    if (!canPlayerAct()) return;
    const r = playStone(x, y, BLACK);
    if (!r.legal) {
      state.message = `此手不成立：${r.reason}`;
      renderStatus();
      return;
    }
    if (r.captured.length) state.message = `提子 ${r.captured.length} 顆，厚勢頓成`;
    update();
    maybeStartAi();
  }

  function pass() {
    if (!canPlayerAct()) return;
    pushEntry(nextEntry(latest(), {}));
    state.passes++;
    const id = state.gameId;
    // A pass only ends the game once the board is nearly full.
    setTimeout(() => {
      if (id === state.gameId && !state.over && isNearlyFull(latest().board)) {
        finishByScore();
        update();
      }
    }, 400);
    update();
    maybeStartAi();
  }
  function isNearlyFull(board) {
    return board.flat().filter((v) => v === EMPTY).length < 20;
  }

  function resign() {
    if (state.over) return;
    state.over = true;
    state.winner = WHITE;
    state.resultText = '黑方認輸';
    state.message = '承讓，終局待計目';
    update();
  }

  function undo() {
    if (state.history.length <= 1 || state.aiThinking) return;
    state.history.pop();
    if (state.history.length > 1 && latest().player === WHITE) state.history.pop();
    Object.assign(state, { review: null, over: false, winner: null, resultText: '', passes: 0, turnStartedAt: Date.now() });
    state.message = '悔棋回溯，時鐘已還原';
    update();
    maybeStartAi();
  }

  function newGame() {
    state.gameId++;
    state.history = [initialEntry()];
    Object.assign(state, {
      review: null, over: false, winner: null, resultText: '', passes: 0,
      aiThinking: false, paused: false, turnStartedAt: Date.now(),
    });
    state.message = '新局開始，黑先行棋';
    update();
  }

  function scoreOf(entry) {
    const owner = G.territory(entry.board);
    const t = G.countOwner(entry.board, owner);
    const blackScore = t.b + entry.capturedB;
    const whiteScore = t.w + entry.capturedW + KOMI;
    const diff = blackScore - whiteScore;
    return {
      winner: diff > 0 ? BLACK : WHITE,
      text: diff > 0 ? `黑勝 ${diff.toFixed(1)} 目` : `白勝 ${(-diff).toFixed(1)} 目`,
      blackScore, whiteScore,
    };
  }
  function finishByScore() {
    const s = scoreOf(latest());
    state.over = true;
    state.winner = s.winner;
    state.resultText = s.text;
  }

  // ---------- AI turn ----------
  function maybeStartAi() {
    const entry = latest();
    if (entry.player !== WHITE || state.over || state.paused || state.review !== null || state.aiThinking) return;
    state.aiThinking = true;
    state.message = '弈士思索中…';
    const id = state.gameId;
    update();
    setTimeout(() => {
      if (id !== state.gameId || latest() !== entry) return;
      state.aiThinking = false;
      const move = AI.chooseMove(entry.board, WHITE, state.level, entry.ko, entry.capturedW - entry.capturedB);
      if (!move) {
        pushEntry(nextEntry(entry, { intent: '虛著，靜觀其變' }));
        state.passes++;
        state.message = '虛著，靜觀其變';
        finishByScore();
      } else if (playStone(move.x, move.y, WHITE, move.intent).legal) {
        state.message = move.intent;
      }
      update();
    }, 600 + state.level * 120 + Math.random() * 300);
  }

  // ---------- Clock ----------
  function onClockTick() {
    if (state.paused || state.over || state.review !== null || !state.settings.enabled) return;
    const entry = latest();
    const key = colorKey(entry.player);
    const t = Clock.tick(entry.clocks[key], state.settings);
    // The newest entry holds the running clock; older entries stay as snapshots.
    entry.clocks = { ...entry.clocks, [key]: t.clock };
    if (t.timeout) {
      state.over = true;
      state.winner = G.other(entry.player);
      state.resultText = '超時負';
      if (state.sound) Sound.timeout();
      update();
      return;
    }
    if (state.sound) {
      if (t.enteredPeriod) Sound.drum();
      if (t.secondChanged) Sound.countdown(t.seconds, t.clock.inByo);
    }
    renderClocks();
  }

  // ---------- Stats ----------
  function moveStats() {
    const list = state.history.slice(1).map((e, i) => {
      const mover = state.history[i].player;
      return {
        index: i + 1, n: e.moveNum, color: mover,
        pos: e.lastMove ? G.toCoord(e.lastMove[0], e.lastMove[1], SIZE) : '虛著',
        think: e.thinkTime, remaining: e.clocks[colorKey(mover)], capture: e.captureCount || 0,
      };
    });
    const times = list.map((m) => m.think);
    const total = times.reduce((a, b) => a + b, 0);
    const stats = {
      list, total,
      avg: times.length ? total / times.length : 0,
      max: times.length ? Math.max(...times) : 0,
      min: times.length ? Math.min(...times) : 0,
    };
    list.forEach((m) => { m.key = m.think > stats.avg * 1.8 || m.capture >= 2; });
    return stats;
  }

  // ---------- Rendering ----------
  let renderedLastMove = null;

  function buildBoard() {
    const el = $('board');
    let html = '';
    for (let i = 0; i < SIZE; i++) {
      html += `<div class="grid-h" style="top:${pct(i)}"></div><div class="grid-v" style="left:${pct(i)}"></div>`;
    }
    for (const [x, y] of STAR_POINTS) html += `<div class="star" style="left:${pct(x)};top:${pct(y)}"></div>`;
    html += `<div class="labels-top">${Array.from(COLS, (c) => `<span>${c}</span>`).join('')}</div>`;
    html += `<div class="labels-left">${Array.from({ length: SIZE }, (_, i) => `<span>${SIZE - i}</span>`).join('')}</div>`;
    html += '<div class="layer" id="influence-layer"></div><div class="layer" id="stone-layer"></div>';
    html += '<div class="layer"><div class="at stone ghost" id="ghost" hidden></div><div class="at spinner-host" id="ai-spinner" hidden><div class="spinner-ring"></div></div></div>';
    el.innerHTML = html;

    const pointAt = (ev) => {
      const rect = el.getBoundingClientRect();
      const x = Math.round(((ev.clientX - rect.left) / rect.width) * (SIZE - 1));
      const y = Math.round(((ev.clientY - rect.top) / rect.height) * (SIZE - 1));
      return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? [x, y] : null;
    };
    el.addEventListener('click', (ev) => {
      const p = pointAt(ev);
      if (p) onBoardClick(p[0], p[1]);
    });
    el.addEventListener('pointermove', (ev) => {
      const p = pointAt(ev);
      const ghost = $('ghost');
      if (p && canPlayerAct() && latest().board[p[1]][p[0]] === EMPTY) {
        ghost.className = `at stone ghost stone-${colorKey(latest().player)}`;
        ghost.style.left = pct(p[0]);
        ghost.style.top = pct(p[1]);
        ghost.hidden = false;
      } else ghost.hidden = true;
    });
    el.addEventListener('pointerleave', () => { $('ghost').hidden = true; });
  }

  // Stone influence within 5 lines, for the faint shading outside settled territory.
  function influenceMap(board) {
    const map = G.createBoard(SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] !== EMPTY) continue;
        let s = 0;
        for (let sy = 0; sy < SIZE; sy++) {
          for (let sx = 0; sx < SIZE; sx++) {
            if (board[sy][sx] === EMPTY) continue;
            const d = Math.abs(sx - x) + Math.abs(sy - y);
            if (d <= 5) s += (board[sy][sx] === BLACK ? 1 : -1) * (6 - d);
          }
        }
        map[y][x] = s;
      }
    }
    return map;
  }

  function renderBoard() {
    const entry = shown();
    const { board, lastMove } = entry;
    const moveKey = lastMove ? lastMove.join(',') + '@' + entry.moveNum : null;
    const bounce = moveKey !== renderedLastMove;
    renderedLastMove = moveKey;

    let stones = '';
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const v = board[y][x];
        if (v === EMPTY) continue;
        const isLast = lastMove && lastMove[0] === x && lastMove[1] === y;
        const ring = isLast ? `<div class="pulse-ring" style="border-color:${v === BLACK ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)'}"></div>` : '';
        stones += `<div class="at stone stone-${colorKey(v)}${isLast && bounce ? ' stone-bounce' : ''}" style="left:${pct(x)};top:${pct(y)}">${ring}</div>`;
      }
    }
    $('stone-layer').innerHTML = stones;

    let shade = '';
    if (state.showInfluence) {
      const owner = G.territory(board);
      const infl = influenceMap(board);
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const o = owner[y][x];
          if (o === EMPTY && Math.abs(infl[y][x]) < 2) continue;
          const bg = o === BLACK ? 'rgba(0,0,0,0.14)' : o === WHITE ? 'rgba(255,255,255,0.55)'
            : infl[y][x] > 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.28)';
          shade += `<div class="at influence-dot" style="left:${pct(x)};top:${pct(y)};background:${bg}"></div>`;
        }
      }
    }
    $('influence-layer').innerHTML = shade;

    const spinner = $('ai-spinner');
    spinner.hidden = !(state.aiThinking && lastMove);
    if (!spinner.hidden) {
      spinner.style.left = pct(lastMove[0]);
      spinner.style.top = pct(lastMove[1]);
    }
    if (!canPlayerAct()) $('ghost').hidden = true;
  }

  function renderControls() {
    $('level').value = String(state.level);
    $('btn-influence').textContent = `形勢 ${state.showInfluence ? '開' : '關'}`;
    $('btn-influence').classList.toggle('active', state.showInfluence);
    $('btn-review').classList.toggle('active', state.review !== null);
    $('btn-pause').textContent = state.paused ? '繼續' : '暫停';
    $('btn-sound').textContent = state.sound ? '🔊' : '🔈';
    $('btn-undo').disabled = state.history.length <= 1 || state.aiThinking;
    const s = state.settings;
    $('ts-preset').value = s.preset;
    $('ts-enabled').checked = s.enabled;
    $('ts-main').value = s.mainMinutes;
    $('ts-periods').value = s.periods;
    $('ts-seconds').value = s.periodSeconds;
  }

  function renderStatus() {
    $('status-text').textContent = state.aiThinking ? '弈士思索中…' : state.message;
    $('status-sub').textContent = `段位 ${state.level}段 · ${AI.describeLevel(state.level)}`;
    $('status-spinner').hidden = !state.aiThinking;
    const badge = $('badge-result');
    badge.hidden = !state.over;
    badge.textContent = `${state.winner === BLACK ? '黑勝' : '白勝'} · ${state.resultText}`;
    $('badge-paused').hidden = !state.paused;
  }

  function buildClocks() {
    $('clocks').innerHTML = ['black', 'white'].map((k) => `
      <div class="clock" id="clock-${k}">
        <div class="clock-row">
          <div class="clock-name"><span class="swatch ${k}"></span><span>${k === 'black' ? '黑方' : '白方 (AI)'}</span><span class="turn-tag" hidden>行棋中</span></div>
          <div class="clock-time mono"></div>
        </div>
        <div class="clock-sub"></div>
        <div class="clock-bar"><div></div></div>
      </div>`).join('');
  }
  function renderClocks() {
    const entry = shown();
    const s = state.settings;
    $('clock-state').textContent = s.enabled ? '已啟用' : '未啟用';
    for (const k of ['black', 'white']) {
      const c = entry.clocks[k];
      const card = $('clock-' + k);
      const active = colorKey(entry.player) === k && !state.over && state.review === null && !state.paused;
      const left = Clock.remaining(c);
      card.classList.toggle('active', active);
      card.classList.toggle('warn', active && left < 30 && left >= 10);
      card.classList.toggle('critical', active && left < 10);
      card.querySelector('.turn-tag').hidden = !active;
      card.querySelector('.clock-time').textContent = Clock.formatMain(c, s.enabled);
      card.querySelector('.clock-sub').textContent = Clock.describe(c, s);
      card.querySelector('.clock-bar > div').style.width = Clock.fraction(c, s) * 100 + '%';
    }
  }

  function renderTiming() {
    const stats = moveStats();
    $('move-count').textContent = `共 ${stats.list.length} 手`;
    $('stat-avg').textContent = stats.avg.toFixed(1) + 's';
    $('stat-max').textContent = stats.max.toFixed(1) + 's';
    $('stat-min').textContent = stats.min.toFixed(1) + 's';
    $('stat-total').textContent = stats.total.toFixed(1) + 's';
    const max = stats.max || 1;
    $('timing-bars').innerHTML = stats.list.slice(-12).reverse().map((m) => `
      <div class="bar-row">
        <span class="n">${m.n}</span><span class="swatch ${colorKey(m.color)}" style="width:8px;height:8px"></span>
        <span class="pos">${m.pos}</span>
        <div class="track"><div class="fill-${colorKey(m.color)}" style="width:${(m.think / max) * 100}%"></div>${m.key ? '<div class="key-tri"></div>' : ''}</div>
        <span class="t mono">${m.think.toFixed(1)}s</span>
      </div>`).join('');
    const current = state.review === null ? stats.list.length : state.review;
    $('move-list').innerHTML = stats.list.map((m) => `
      <button class="move-row${m.index === current ? ' current' : m.key ? ' key' : ''}" data-index="${m.index}">
        <span class="n mono">${m.n}</span><span class="swatch ${colorKey(m.color)}" style="width:8px;height:8px"></span>
        <span class="pos">${m.pos}</span><span class="mono">${m.think.toFixed(1)}s</span>
        <span class="rem">${Clock.formatMain(m.remaining, state.settings.enabled)}</span>${m.key ? '<span class="mark">▲</span>' : ''}
      </button>`).join('');
  }

  function renderReview() {
    const bar = $('review-bar');
    bar.hidden = state.review === null;
    if (bar.hidden) return;
    const last = state.history.length - 1;
    $('review-label').textContent = `覆盤 ${state.review}/${last}`;
    const range = $('review-range');
    range.max = String(last);
    range.value = String(state.review);
  }

  function renderResult() {
    const card = $('result-card');
    card.hidden = !state.over;
    if (!state.over) return;
    const s = scoreOf(latest());
    $('result-text').textContent = s.text;
    $('result-detail').textContent = `黑空 ${s.blackScore} (含提子) · 白空 ${s.whiteScore.toFixed(1)} · 實地+外勢綜合判定`;
  }

  function update() {
    renderControls();
    renderBoard();
    renderStatus();
    renderClocks();
    renderTiming();
    renderReview();
    renderResult();
  }

  function setReview(index) {
    state.review = index;
    update();
    if (index === null) maybeStartAi();
  }

  // ---------- Wiring ----------
  function bindControls() {
    $('level').innerHTML = Array.from({ length: 9 }, (_, i) => {
      const lv = i + 1;
      return `<option value="${lv}">${lv}段 ${lv <= 3 ? '初段' : lv <= 6 ? '中段' : '高段'}</option>`;
    }).join('');
    $('level').addEventListener('change', (ev) => {
      state.level = Number(ev.target.value);
      update();
      maybeStartAi();
    });
    $('btn-new').addEventListener('click', newGame);
    $('btn-pass').addEventListener('click', pass);
    $('btn-resign').addEventListener('click', resign);
    $('btn-undo').addEventListener('click', undo);
    $('btn-influence').addEventListener('click', () => { state.showInfluence = !state.showInfluence; update(); });
    $('btn-review').addEventListener('click', () => setReview(state.review === null ? state.history.length - 1 : null));
    $('btn-pause').addEventListener('click', () => {
      state.paused = !state.paused;
      update();
      maybeStartAi();
    });
    $('btn-sound').addEventListener('click', () => { state.sound = !state.sound; renderControls(); });
    $('btn-time').addEventListener('click', () => { $('time-settings').hidden = !$('time-settings').hidden; });

    $('ts-preset').innerHTML = Object.entries(Clock.PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('');
    $('ts-preset').addEventListener('change', (ev) => {
      // Picking a preset fills in the custom fields; "套用並重開" starts a game with them.
      Object.assign(state.settings, { preset: ev.target.value, enabled: true, ...Clock.PRESETS[ev.target.value] });
      renderControls();
    });
    $('ts-enabled').addEventListener('change', (ev) => { state.settings.enabled = ev.target.checked; update(); });
    const numberField = (id, key, min) => {
      $(id).addEventListener('change', (ev) => {
        state.settings[key] = Math.max(min, Number(ev.target.value) || min);
        renderControls();
      });
    };
    numberField('ts-main', 'mainMinutes', 1);
    numberField('ts-periods', 'periods', 0);
    numberField('ts-seconds', 'periodSeconds', 5);
    $('ts-apply').addEventListener('click', newGame);

    $('review-range').addEventListener('input', (ev) => {
      let index = Number(ev.target.value);
      // Snap to a nearby key move so the important moments are easy to land on.
      const key = moveStats().list.find((m) => m.key && Math.abs(m.index - index) <= 1);
      if (key) index = key.index;
      setReview(index);
    });
    $('review-exit').addEventListener('click', () => setReview(null));
    $('move-list').addEventListener('click', (ev) => {
      const row = ev.target.closest('[data-index]');
      if (row) setReview(Number(row.dataset.index));
    });
    $('result-again').addEventListener('click', newGame);
    $('result-influence').addEventListener('click', () => { state.showInfluence = true; update(); });
  }

  buildBoard();
  buildClocks();
  bindControls();
  newGame();
  state.message = '初手佈局，請多指教';
  renderStatus();
  setInterval(onClockTick, Clock.TICK * 1000);
})();
