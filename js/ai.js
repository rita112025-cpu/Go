// Ranked AI for the 19x19 game. Three tiers by dan level:
//   1-3 dan: mostly random, likes star points
//   4-6 dan: one-ply heuristics (captures, saving stones, corners)
//   7-9 dan: top-12 candidates with a 2-ply min search over a static evaluation
(function (root) {
  'use strict';
  const G = root.GoEngine;
  const { EMPTY } = G;

  const OPENING_POINTS = [[3, 3], [15, 3], [3, 15], [15, 15], [9, 9], [3, 9], [9, 3], [15, 9], [9, 15]];
  const CORNER_POINTS = [[3, 3], [15, 3], [3, 15], [15, 15]];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  // Empty points within two lines of any stone; the opening points on an empty board.
  function nearbyPoints(board) {
    const size = board.length;
    const seen = new Set();
    const out = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === EMPTY) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size || board[ny][nx] !== EMPTY) continue;
            const k = nx + ',' + ny;
            if (!seen.has(k)) {
              seen.add(k);
              out.push([nx, ny]);
            }
          }
        }
      }
    }
    return out.length ? out : [[3, 3], [15, 3], [3, 15], [15, 15], [9, 9]];
  }

  // Static evaluation from `color`'s point of view.
  function evaluate(board, color, captureLead) {
    const size = board.length;
    const opp = G.other(color);
    let stones = 0, liberties = 0;
    const counted = new Set();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = board[y][x];
        if (v === EMPTY) continue;
        stones += v === color ? 1 : -1;
        if (counted.has(x + ',' + y)) continue;
        const g = G.getGroup(board, x, y);
        g.stones.forEach(([sx, sy]) => counted.add(sx + ',' + sy));
        liberties += (g.color === color ? 1 : -1) * g.libs.length;
      }
    }
    const owner = G.territory(board);
    let territory = 0, influence = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (owner[y][x] === color) territory++;
        else if (owner[y][x] === opp) territory--;
        if (board[y][x] !== EMPTY || owner[y][x] === EMPTY) continue;
        let pull = 0;
        for (let sy = 0; sy < size; sy++) {
          for (let sx = 0; sx < size; sx++) {
            if (board[sy][sx] === EMPTY) continue;
            const d = Math.abs(sx - x) + Math.abs(sy - y);
            if (d <= 4) pull += (board[sy][sx] === color ? 1 : -1) * (5 - d);
          }
        }
        influence += (owner[y][x] === color ? 1 : -1) * pull * 0.1;
      }
    }
    return stones + territory * 1.5 + liberties * 0.15 + captureLead * 2 + influence;
  }

  // One-ply candidate ordering: captures, saving stones in atari, closeness to corners.
  function rankCandidates(board, color, ko) {
    const size = board.length;
    const out = [];
    for (const [x, y] of nearbyPoints(board)) {
      const r = G.play(board, x, y, color, ko);
      if (!r.legal) continue;
      const cap = r.captured.length;
      let score = cap * 100;
      let save = false;
      for (const [nx, ny] of G.neighbors(size, x, y)) {
        if (board[ny][nx] === color && G.getGroup(board, nx, ny).libs.length === 1) {
          save = true;
          score += 80;
        }
      }
      const cornerDist = Math.min(...CORNER_POINTS.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
      if (cornerDist < 3) score += 20 - cornerDist * 5;
      if (x <= 5 || x >= 13 || y <= 5 || y >= 13) score += 5;
      out.push({ x, y, score, cap, save, result: r });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  function chooseBeginner(board, color, ko) {
    const openings = OPENING_POINTS.filter(([x, y]) => board[y][x] === EMPTY && G.play(board, x, y, color, ko).legal);
    if (openings.length && Math.random() < 0.7) {
      const [x, y] = pick(openings);
      return { x, y, intent: '佔角取勢，奠定基礎' };
    }
    const legal = nearbyPoints(board).filter(([x, y]) => G.play(board, x, y, color, ko).legal);
    if (!legal.length) return null;
    const [x, y] = pick(legal);
    return { x, y, intent: Math.random() < 0.5 ? '拆邊擴張，構築模樣' : '隨手應對，尋求變化' };
  }

  function chooseIntermediate(board, color, ko, level) {
    const ranked = rankCandidates(board, color, ko);
    if (!ranked.length) return null;
    const top = ranked.slice(0, Math.max(3, 8 - level));
    const m = top[Math.floor(Math.random() * Math.min(2, top.length))];
    let intent;
    if (m.cap > 0) intent = '攻擊弱子，爭取實地';
    else if (m.save) intent = '補強孤子，確保聯絡';
    else if (Math.hypot(m.x - 9, m.y - 9) > 6) intent = '拆邊擴張，構築模樣';
    else intent = '鞏固實地，厚實取利';
    return { x: m.x, y: m.y, intent };
  }

  function chooseAdvanced(board, color, ko, captureLead) {
    const candidates = rankCandidates(board, color, ko).slice(0, 12);
    if (!candidates.length) return null;
    const opp = G.other(color);
    let best = candidates[0];
    let bestScore = -Infinity;
    for (const c of candidates) {
      const lead = captureLead + c.cap;
      let value = evaluate(c.result.board, color, lead);
      const replies = rankCandidates(c.result.board, opp, c.result.ko).slice(0, 6);
      let worst = Infinity;
      for (const r of replies) {
        worst = Math.min(worst, evaluate(r.result.board, color, lead - r.cap));
      }
      if (worst !== Infinity) value = (value + worst) / 2;
      if (value > bestScore) {
        bestScore = value;
        best = c;
      }
    }
    let intent;
    if (best.cap > 0) intent = '攻擊弱子，順勢圍空';
    else if (best.save) intent = '補強孤子，厚薄分明';
    else {
      const owner = G.territory(board)[best.y][best.x];
      if (owner !== EMPTY && owner !== color) intent = '打入破空，試探應手';
      else if (owner === EMPTY) intent = '拆邊擴張，構築大模樣';
      else intent = '鞏固實地，步步為營';
    }
    return { x: best.x, y: best.y, intent, score: bestScore };
  }

  // Returns { x, y, intent } or null when the AI wants to pass.
  function chooseMove(board, color, level, ko, captureLead) {
    if (level <= 3) return chooseBeginner(board, color, ko);
    if (level <= 6) return chooseIntermediate(board, color, ko, level);
    return chooseAdvanced(board, color, ko, captureLead);
  }

  function describeLevel(level) {
    if (level <= 3) return '隨機佔角·輕靈';
    if (level <= 6) return '吃子自救·佔角拆邊';
    return '吃子自救·佔角拆邊 · Top12淺搜評估=領地+影響力+氣';
  }

  root.GoAI = { chooseMove, describeLevel };
})(window);
