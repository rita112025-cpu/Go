(function (root) {
  'use strict';
  const G = root.GoEngine;
  const { EMPTY, other } = G;

  const PRINCIPLES = {
    capture: '提子是最實在的收穫。先看有沒有能吃的棋，是每一手的第一個檢查。',
    save: '自己的棋被叫吃了，如果還逃得出去，就要先救——「攻彼顧我」。',
    kill: '要吃就吃乾淨：叫吃之後對方逃不掉（征子），這一手非常有力。',
    net: '不必急著叫吃。封住對方的去路（枷），讓它無路可逃。',
    connect: '連則強，斷則弱。把危險的棋連成一塊，厚實就是力量。',
    cut: '「棋從斷處生」——切斷對方，讓它兩邊都要照顧。',
    corner: '「金角銀邊草肚皮」：角上用最少的子就能圍到地，先佔空角。',
    extend: '向寬廣處展開，與自己的子保持適當距離（立二拆三），效率最高。',
    approach: '靠近對方的子施壓，同時與自己的子呼應，攻守兼備。',
    selfatari: '下完自己只剩一口氣（自緊氣），對方一手就能提掉。',
    futile: '這塊棋已經逃不掉了，越逃損失越大——「逢危須棄」。',
    weak: '這手之後自己的棋會被征吃或枷吃，形狀很薄。',
    eye: '這是自己的眼位，填掉等於自毀根基。',
    edge: '一路（邊線）的子效率很低，除非是官子或死活要點，否則別急著下。',
    slow: '貼著自己的子下，棋形重複、效率偏低（俗稱「愚形」）。',
  };

  function lineOf(size, x, y) {
    return Math.min(x, y, size - 1 - x, size - 1 - y);
  }
  function nearestStone(board, x, y, color) {
    let best = Infinity;
    for (let sy = 0; sy < board.length; sy++) {
      for (let sx = 0; sx < board.length; sx++) {
        if (board[sy][sx] !== color) continue;
        best = Math.min(best, Math.abs(sx - x) + Math.abs(sy - y));
      }
    }
    return best;
  }
  function adjacentGroups(board, x, y, color) {
    const groups = [];
    const seen = new Set();
    for (const [nx, ny] of G.neighbors(board.length, x, y)) {
      if (board[ny][nx] !== color || seen.has(nx + ',' + ny)) continue;
      const g = G.getGroup(board, nx, ny);
      g.stones.forEach(([sx, sy]) => seen.add(sx + ',' + sy));
      groups.push(g);
    }
    return groups;
  }
  function quadrantEmpty(board, x, y) {
    const size = board.length;
    const mid = Math.floor(size / 2);
    const xs = x < mid ? [0, mid - 1] : [mid + 1, size - 1];
    const ys = y < mid ? [0, mid - 1] : [mid + 1, size - 1];
    for (let yy = ys[0]; yy <= ys[1]; yy++) {
      for (let xx = xs[0]; xx <= xs[1]; xx++) if (board[yy][xx] !== EMPTY) return false;
    }
    return true;
  }

  // Scores every legal move for `color` and explains why, so the same analysis
  // drives the AI, the hint button and the per-move review.
  function analyzeMoves(board, color, ko, moveNum) {
    const size = board.length;
    const opp = other(color);
    const mid = Math.floor(size / 2);
    const out = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== EMPTY) continue;
        const r = G.play(board, x, y, color, ko);
        if (!r.legal) continue;
        const reasons = [];
        const add = (tag, text, w) => reasons.push({ tag, text, w });
        const coord = G.toCoord(x, y, size);

        const neigh = G.neighbors(size, x, y);
        if (neigh.every(([nx, ny]) => board[ny][nx] === color) && !r.captured.length) {
          add('eye', `${coord} 是自己的眼`, -70);
        }
        if (r.captured.length) add('capture', `${coord} 提掉 ${r.captured.length} 子`, 60 + 25 * r.captured.length);

        for (const g of adjacentGroups(board, x, y, color)) {
          if (g.libs.length !== 1) continue;
          const after = G.getGroup(r.board, x, y);
          const safe = after.libs.length >= 3 ||
            (after.libs.length === 2 && !G.canCapture(r.board, x, y, true, 12, r.ko, { nodes: 3000 }));
          if (safe) add('save', `${coord} 救出被叫吃的 ${g.stones.length} 子`, 50 + 20 * g.stones.length);
          else if (!r.captured.length) add('futile', `${coord} 想逃但仍會被吃`, -25 - 5 * g.stones.length);
        }

        const mine = G.getGroup(r.board, x, y);
        if (mine.libs.length === 1 && !r.captured.length) {
          add('selfatari', `${coord} 自緊氣，只剩一口氣`, -70 - 10 * mine.stones.length);
        } else if (mine.libs.length === 2 && G.canCapture(r.board, x, y, true, 10, r.ko, { nodes: 2000 })) {
          add('weak', `${coord} 之後會被征吃或枷吃`, -35);
        }

        for (const g of adjacentGroups(r.board, x, y, opp)) {
          const [gx, gy] = g.stones[0];
          if (g.libs.length === 1) {
            const dead = G.canCapture(r.board, gx, gy, false, 12, r.ko, { nodes: 3000 });
            if (dead) add('kill', `${coord} 叫吃 ${g.stones.length} 子，對方逃不掉`, 40 + 15 * g.stones.length);
            else add('atari', `${coord} 叫吃`, 6);
          } else if (g.libs.length === 2 && G.canCapture(r.board, gx, gy, false, 12, r.ko, { nodes: 3000 })) {
            add('net', `${coord} 封鎖 ${g.stones.length} 子的退路`, 30 + 12 * g.stones.length);
          }
        }

        const ownAdj = adjacentGroups(board, x, y, color);
        if (ownAdj.length >= 2) {
          const weak = ownAdj.some((g) => g.libs.length <= 2);
          add('connect', `${coord} 把棋連起來`, weak ? 22 : 8);
        }
        if (adjacentGroups(board, x, y, opp).length >= 2) add('cut', `${coord} 切斷對方`, 14);

        const line = lineOf(size, x, y);
        const myDist = nearestStone(board, x, y, color);
        const oppDist = nearestStone(board, x, y, opp);
        const anyDist = Math.min(myDist, oppDist);
        if (moveNum < 10 && line === 2 && x !== mid && y !== mid && quadrantEmpty(board, x, y)) {
          add('corner', `${coord} 佔空角`, 32);
        }
        if (line === 0) add('edge', `${coord} 在一路`, moveNum < 30 ? -14 : -4);
        else if (line === 1 && moveNum < 16) add('edge', `${coord} 在二路`, -4);
        if (anyDist >= 3 && myDist <= 4 && myDist !== Infinity && line >= 1) add('extend', `${coord} 拆邊展開`, 12);
        if (oppDist === 2 && myDist <= 3 && line >= 1) add('approach', `${coord} 靠近施壓`, 6);
        if (myDist === 1 && oppDist > 2 && !r.captured.length && !reasons.some((q) => q.tag === 'save' || q.tag === 'connect')) {
          add('slow', `${coord} 緊貼己子`, -6);
        }
        if (line >= 2 && line <= 3) add('line', '', 2);

        const score = reasons.reduce((s, q) => s + q.w, 0);
        const sorted = reasons.filter((q) => q.text).sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
        const main = score >= 0
          ? sorted.find((q) => q.w > 0) || null
          : sorted.find((q) => q.w < 0) || null;
        out.push({ x, y, score, reasons, main });
      }
    }
    return out.sort((a, b) => b.score - a.score);
  }

  root.GoCoach = { analyzeMoves, PRINCIPLES };
})(window);
