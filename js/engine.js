(function (root) {
  'use strict';
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const COLS = 'ABCDEFGHJKLMNOPQRST';
  const other = (c) => (c === BLACK ? WHITE : BLACK);
  const key = (x, y) => x + ',' + y;

  function createBoard(size) {
    return Array.from({ length: size }, () => Array(size).fill(EMPTY));
  }
  function cloneBoard(b) {
    return b.map((r) => r.slice());
  }
  function neighbors(size, x, y) {
    const out = [];
    if (x > 0) out.push([x - 1, y]);
    if (x < size - 1) out.push([x + 1, y]);
    if (y > 0) out.push([x, y - 1]);
    if (y < size - 1) out.push([x, y + 1]);
    return out;
  }
  function getGroup(board, x, y) {
    const color = board[y][x];
    if (color === EMPTY) return null;
    const size = board.length;
    const seen = new Set([key(x, y)]);
    const libSet = new Set();
    const stones = [];
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      stones.push([cx, cy]);
      for (const [nx, ny] of neighbors(size, cx, cy)) {
        const v = board[ny][nx];
        if (v === EMPTY) libSet.add(key(nx, ny));
        else if (v === color && !seen.has(key(nx, ny))) {
          seen.add(key(nx, ny));
          stack.push([nx, ny]);
        }
      }
    }
    const libs = Array.from(libSet, (k) => k.split(',').map(Number));
    return { color, stones, libs };
  }
  function play(board, x, y, color, ko) {
    if (board[y][x] !== EMPTY) return { legal: false, reason: '此處已有棋子' };
    if (ko && ko[0] === x && ko[1] === y) return { legal: false, reason: '劫爭：不能立即提回，要先在別處找劫材' };
    const size = board.length;
    const next = cloneBoard(board);
    next[y][x] = color;
    const captured = [];
    for (const [nx, ny] of neighbors(size, x, y)) {
      if (next[ny][nx] !== other(color)) continue;
      const g = getGroup(next, nx, ny);
      if (g.libs.length === 0) {
        for (const [sx, sy] of g.stones) {
          next[sy][sx] = EMPTY;
          captured.push([sx, sy]);
        }
      }
    }
    const self = getGroup(next, x, y);
    if (self.libs.length === 0) return { legal: false, reason: '禁著點：下在這裡自己沒有氣' };
    const newKo = captured.length === 1 && self.stones.length === 1 && self.libs.length === 1 ? captured[0] : null;
    return { legal: true, board: next, captured, ko: newKo };
  }
  function parseDiagram(rows) {
    return rows.map((row) => Array.from(row, (ch) => (ch === 'X' ? BLACK : ch === 'O' ? WHITE : EMPTY)));
  }
  function toCoord(x, y, size) {
    return COLS[x] + (size - y);
  }
  function fromCoord(str, size) {
    return [COLS.indexOf(str[0].toUpperCase()), size - parseInt(str.slice(1), 10)];
  }

  // Tactical reader for ladders, nets and snapbacks: can the attacker capture the
  // group at (tx, ty)? Only follows forcing lines (target with at most 2 liberties).
  function canCapture(board, tx, ty, attackerToMove, depth, ko, budget) {
    budget = budget || { nodes: 20000 };
    if (--budget.nodes < 0) return false;
    if (board[ty][tx] === EMPTY) return true;
    const g = getGroup(board, tx, ty);
    const attacker = other(g.color);
    const size = board.length;
    if (attackerToMove) {
      if (g.libs.length === 1) {
        const [lx, ly] = g.libs[0];
        if (play(board, lx, ly, attacker, ko).legal) return true;
      }
      if (g.libs.length >= 3 || depth <= 0) return false;
      const cand = new Map();
      for (const [lx, ly] of g.libs) cand.set(key(lx, ly), [lx, ly]);
      for (const [lx, ly] of g.libs) {
        for (const [nx, ny] of neighbors(size, lx, ly)) {
          if (board[ny][nx] === EMPTY && !cand.has(key(nx, ny))) cand.set(key(nx, ny), [nx, ny]);
        }
      }
      for (const [cx, cy] of cand.values()) {
        const r = play(board, cx, cy, attacker, ko);
        if (!r.legal) continue;
        if (canCapture(r.board, tx, ty, false, depth - 1, r.ko, budget)) return true;
      }
      return false;
    }
    if (g.libs.length >= 3 || depth <= 0) return false;
    let any = false;
    for (const [cx, cy] of defenderMoves(board, g)) {
      const r = play(board, cx, cy, g.color, ko);
      if (!r.legal) continue;
      any = true;
      if (!canCapture(r.board, tx, ty, true, depth - 1, r.ko, budget)) return false;
    }
    if (!any) return canCapture(board, tx, ty, true, depth - 1, null, budget);
    return true;
  }
  function defenderMoves(board, g) {
    const size = board.length;
    const cand = new Map();
    for (const [lx, ly] of g.libs) cand.set(key(lx, ly), [lx, ly]);
    const seen = new Set();
    for (const [sx, sy] of g.stones) {
      for (const [nx, ny] of neighbors(size, sx, sy)) {
        if (board[ny][nx] !== other(g.color) || seen.has(key(nx, ny))) continue;
        const eg = getGroup(board, nx, ny);
        eg.stones.forEach(([ex, ey]) => seen.add(key(ex, ey)));
        if (eg.libs.length === 1) cand.set(key(eg.libs[0][0], eg.libs[0][1]), eg.libs[0]);
      }
    }
    return Array.from(cand.values());
  }
  // Best defender reply: one that escapes if possible, else the one keeping most liberties.
  function bestDefense(board, tx, ty, ko, depth) {
    const g = getGroup(board, tx, ty);
    let best = null;
    for (const [cx, cy] of defenderMoves(board, g)) {
      const r = play(board, cx, cy, g.color, ko);
      if (!r.legal) continue;
      const escapes = !canCapture(r.board, tx, ty, true, depth, r.ko);
      const libs = getGroup(r.board, tx, ty).libs.length;
      const value = (escapes ? 1000 : 0) + libs * 10 + r.captured.length;
      if (!best || value > best.value) best = { x: cx, y: cy, result: r, escapes, value };
    }
    return best;
  }

  function territory(board) {
    const size = board.length;
    const owner = createBoard(size);
    const seen = createBoard(size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== EMPTY || seen[y][x]) continue;
        const region = [];
        const borders = new Set();
        const stack = [[x, y]];
        seen[y][x] = 1;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          region.push([cx, cy]);
          for (const [nx, ny] of neighbors(size, cx, cy)) {
            const v = board[ny][nx];
            if (v === EMPTY && !seen[ny][nx]) {
              seen[ny][nx] = 1;
              stack.push([nx, ny]);
            } else if (v !== EMPTY) borders.add(v);
          }
        }
        if (borders.size === 1) {
          const c = borders.values().next().value;
          for (const [rx, ry] of region) owner[ry][rx] = c;
        }
      }
    }
    return owner;
  }
  // Rough ownership estimate from stone influence; used for the "形勢判斷" overlay.
  function influence(board) {
    const size = board.length;
    const owner = createBoard(size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== EMPTY) continue;
        let s = 0;
        for (let sy = 0; sy < size; sy++) {
          for (let sx = 0; sx < size; sx++) {
            const v = board[sy][sx];
            if (v === EMPTY) continue;
            const d = Math.abs(sx - x) + Math.abs(sy - y);
            if (d <= 3) s += (v === BLACK ? 1 : -1) * (4 - d);
          }
        }
        if (s >= 2) owner[y][x] = BLACK;
        else if (s <= -2) owner[y][x] = WHITE;
      }
    }
    return owner;
  }
  function countOwner(board, owner) {
    let b = 0, w = 0;
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board.length; x++) {
        if (board[y][x] !== EMPTY) continue;
        if (owner[y][x] === BLACK) b++;
        else if (owner[y][x] === WHITE) w++;
      }
    }
    return { b, w };
  }

  root.GoEngine = {
    EMPTY, BLACK, WHITE, other, createBoard, cloneBoard, neighbors, getGroup, play,
    parseDiagram, toCoord, fromCoord, canCapture, bestDefense, territory, influence, countOwner,
  };
})(typeof window !== 'undefined' ? window : globalThis);
