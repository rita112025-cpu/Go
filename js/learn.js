(function () {
  'use strict';
  const G = window.GoEngine;
  const { analyzeMoves, PRINCIPLES } = window.GoCoach;
  const { EMPTY, BLACK, WHITE } = G;
  const SIZE = 9;
  const E = '.........';
  const STORE_KEY = 'yijing-learn-v1';

  // ---------- Lessons ----------
  const LESSONS = [
    {
      id: 'liberty',
      title: '一、氣與提子',
      intro: [
        '棋子下在線的交叉點上。與棋子<strong>上下左右</strong>相鄰的空點，叫做這顆子的「氣」。相連的同色棋子共用所有的氣。',
        '當一塊棋的氣全部被對方堵住，就會被「提」走。邊上的子氣比較少，角上的子最少（只有兩口氣）。',
      ],
      essence: '精髓：圍棋的一切戰鬥都從「數氣」開始。每次落子前先問自己：誰的氣比較少？',
      problems: [
        { title: '提掉中間的白子', prompt: '白子只剩一口氣。黑先，請提掉它。', diagram: [E, E, E, '....X....', '...XOX...', E, E, E, E], type: 'capture', target: 'E5', answers: ['E4'], hints: ['數一數白子周圍還有哪個空點？', '堵住最後一口氣就能提子。'], explain: '堵住最後一口氣，白子被提走。提掉的子會算進你的「提子」，終局時每顆算一目。' },
        { title: '邊上的兩顆子', prompt: '白兩子在一路，只剩一口氣。黑先提掉它們。', diagram: [E, E, E, E, E, E, E, '...XX....', '..XOO....'], type: 'capture', target: 'D1', answers: ['F1'], hints: ['相連的兩顆白子共用氣，找它們唯一的空點。', '右邊還有一口氣。'], explain: '相連的子要一起提。邊線少了一面，氣比較少，所以在邊上戰鬥要特別小心。' },
        { title: '角上的子', prompt: '白在角上兩子只剩一口氣。黑先提掉。', diagram: [E, E, E, E, E, E, E, 'XX.......', 'OO.......'], type: 'capture', target: 'A1', answers: ['C1'], hints: ['角上的子天生氣最少。', '往右看。'], explain: '角上的子只有兩面能延氣，最容易被吃。但反過來說，角上也最容易圍地——這是「金角」的由來。' },
      ],
    },
    {
      id: 'atari',
      title: '二、叫吃與逃跑',
      intro: [
        '把對方的氣緊到只剩一口，叫做「叫吃」（打吃）。被叫吃的一方，可以「長」出去增加氣，或吃掉對方的子來解圍。',
        '一手同時叫吃兩塊棋叫「雙叫吃」，對方只能救一邊，另一邊就被吃掉。',
      ],
      essence: '精髓：被叫吃時先判斷「逃得掉嗎」；叫吃對方時先想「它逃得掉嗎」。只想叫吃、不想後果，是初學者最常見的毛病。',
      problems: [
        { title: '救出黑子', prompt: '黑子被叫吃了！黑先，讓它逃出去。', diagram: [E, E, E, '....O....', '...OXO...', E, E, E, E], type: 'escape', target: 'E5', answers: ['E4'], hints: ['往唯一的空點長出去，氣就會變多。', '長出去之後會有三口氣，安全了。'], explain: '長出去後黑棋有三口氣，白棋一時吃不掉。逃跑的方向要朝「空曠」的地方。' },
        { title: '雙叫吃', prompt: '找一手同時叫吃兩顆白子。', diagram: [E, E, E, '..X.X....', '.XO.OX...', E, E, E, E], type: 'point', answers: ['D5'], hints: ['兩顆白子中間有個共同的要點。', '下在兩顆白子正中間。'], explain: 'D5 一手同時叫吃 C5 和 E5，白棋只能救一邊，另一邊一定被吃。這就是「雙叫吃」的威力。' },
      ],
    },
    {
      id: 'ladder',
      title: '三、征子與枷',
      intro: [
        '「征子」是連續叫吃，把對方的棋一路追到邊上吃掉。方向很重要：要從正確的一邊叫吃，否則對方就長出三口氣逃走了。',
        '如果征子的路上有對方的子（征子不利），就改用「枷」：不直接叫吃，而是在斜前方封住去路，像撒網一樣。',
      ],
      essence: '精髓：征子前要先「看路」——路上有沒有對方的子？這就是讀棋（計算）的第一課。',
      problems: [
        { title: '征子', prompt: '白 D4 有兩口氣。黑先，用征子把它吃掉（白棋會自動應對）。', diagram: [E, E, E, E, '...XX....', '..XO.....', E, E, E], type: 'capture', target: 'D4', answers: ['D3'], hints: ['叫吃的方向要讓白棋逃跑後仍然只有兩口氣。', '從下方 D3 叫吃，把白棋往右下邊線趕。'], explain: '從正確方向叫吃，白棋每長一步都只有兩口氣，最後撞上邊線被提。如果從 E4 叫吃，白長 D3 就有三口氣跑掉了。' },
        { title: '枷吃', prompt: '這次白在 F2 有一顆「征子破壞子」，直接征子不成立。黑先，換個辦法吃住 D4。', diagram: [E, E, E, E, '...XX....', '..XO.....', '..X......', '.....O...', E], type: 'capture', target: 'D4', answers: ['E3'], hints: ['不要直接叫吃，想想白棋會往哪裡逃。', '在白子斜下方 E3 撒網，封住兩個方向。'], explain: 'E3 這手不叫吃，卻同時封住了 E4 與 D3 兩個方向。白不論往哪邊長，都只剩一兩口氣，逃不出去。這就是「枷」。' },
        { title: '倒撲', prompt: '白 B2 這塊有兩口氣，直接叫吃的話白會連到 D2 那塊逃走。黑先，有一個「送吃再吃回來」的妙手。', diagram: [E, E, E, E, E, E, 'XXOO.....', 'XO.O.....', 'XO.XX....'], type: 'capture', target: 'B2', answers: ['C2'], hints: ['故意把一顆子送給白吃，會發生什麼事？', '下在 C2：白提這顆子之後，自己反而只剩一口氣。'], explain: '黑 C2 送一子，白若在 C1 提，提完後 B2 這塊只剩 C2 一口氣，黑再下 C2 反提三子——這叫「倒撲」。若黑先下 C1 叫吃，白 C2 一連就和上方會合逃走了。' },
      ],
    },
    {
      id: 'eyes',
      title: '四、眼與死活',
      intro: [
        '被圍起來的空點叫「眼」。對方不能下進只有一個空點、四周都是你的子的眼（那是禁著點），所以<strong>有兩個真眼的棋永遠不會被吃</strong>。',
        '一塊棋的眼位空間有「要點」：自己下在那裡就能分成兩隻眼；對方佔到，就只剩一隻眼而死。',
      ],
      essence: '精髓：「敵之要點即我之要點」。死活的關鍵往往是同一個點——誰先下到誰就贏。',
      problems: [
        { title: '做活：直三', prompt: '黑棋在下方有三格眼位（直三）。黑先，讓這塊棋活。', diagram: [E, E, E, E, E, E, 'OOOOOO...', 'XXXXXO...', 'X...XO...'], type: 'point', answers: ['C1'], hints: ['三格的正中央是要點。', '下在中間，左右各留一隻眼。'], explain: '黑 C1 把空間分成 B1、D1 兩隻真眼，這塊棋就活了。如果讓白先下 C1，黑只剩一隻眼就死了。', wrong: { B1: '下在邊上，剩下兩格連在一起只算一隻眼，白點中央就殺了。', D1: '下在邊上，剩下兩格連在一起只算一隻眼，白點中央就殺了。' } },
        { title: '殺棋：點眼', prompt: '同樣的形狀，這次是白棋的直三。黑先，殺掉白棋。', diagram: [E, E, E, E, E, E, 'XXXXXX...', 'OOOOOX...', 'O...OX...'], type: 'point', answers: ['C1'], hints: ['對方做活的要點，就是你殺棋的要點。', '點在三格的正中央。'], explain: '黑點 C1，白無法做出兩隻眼。白若在旁邊提，黑再緊氣即可吃掉整塊。這就是「敵之要點即我之要點」。' },
        { title: '殺棋：曲三', prompt: '白在角上有三格彎曲的眼位（曲三）。黑先，找到要點殺掉它。', diagram: [E, E, E, E, E, 'XXXX.....', 'OOOX.....', '.OOX.....', '..OX.....'], type: 'point', answers: ['A1'], hints: ['彎曲的三格，要點在轉角。', '和另外兩格都相鄰的那一點。'], explain: 'A1 同時與 A2、B1 相鄰，是曲三的要點。黑佔據後，白只能做出一隻眼。' },
      ],
    },
    {
      id: 'ko',
      title: '五、劫',
      intro: [
        '雙方可以互相提一顆子、無限循環的形狀叫「劫」。規則規定：被提後<strong>不能立刻提回</strong>，必須先在別處下一手（找「劫材」），對方應了才能提回。',
        '劫是圍棋最複雜、也最迷人的部分：要衡量劫的價值和雙方劫材的多少。',
      ],
      essence: '精髓：打劫比的是「全局觀」。劫材是什麼、值不值得，都要放到整盤棋來看。',
      problems: [
        { title: '提劫', prompt: '白 D4 只剩一口氣。黑先提掉它，然後觀察：白能不能馬上提回？', diagram: [E, E, E, E, '...XO....', '..XO.O...', '...XO....', E, E], type: 'capture', target: 'D4', answers: ['E4'], hints: ['白 D4 周圍只剩一個空點。', '下在 E4。'], explain: '黑 E4 提掉一子，但黑 E4 自己也只剩一口氣——這就是劫。白不能立刻在 D4 提回，必須先在別處找劫材。' },
      ],
    },
    {
      id: 'opening',
      title: '六、布局與棋理',
      intro: [
        '布局是「圈地」的開始。同樣圍十目地，在角上需要的子最少，邊上次之，中央最多——所以有「金角銀邊草肚皮」的說法，開局先佔角，再拆邊，最後才往中央發展。',
        '中盤的棋理則講究形狀與效率：連接自己的弱棋、切斷對方、攻擊對方時同時強化自己。',
      ],
      essence: '精髓：每一手都要問「現在棋盤上最大的地方在哪？」——這叫「大局觀」。',
      problems: [
        { title: '最大的一手', prompt: '三個角都有子了。黑先，現在最大的地方在哪？', diagram: [E, E, '..X...O..', E, E, E, '......X..', E, E], type: 'point', answers: ['C3', 'D3', 'C4', 'D4'], hints: ['「金角銀邊草肚皮」。', '左下角還是空的。'], explain: '先佔最後一個空角。角上有兩面邊線幫你圍地，效率最高。' },
        { title: '二子頭必扳', prompt: '黑白各兩子並排，黑先。下一手在哪裡最有力？', diagram: [E, E, E, E, E, '..OO.....', '..XX.....', E, E], type: 'point', answers: ['E4', 'B4'], hints: ['在白兩子的「頭」上扳。', 'E4 或 B4，擋住白棋往前長。'], explain: '在對方兩子的頭上扳，壓低對方、同時讓自己的棋向外發展。俗話說「二子頭必扳」。' },
        { title: '棋從斷處生', prompt: '白兩子斜著擺，中間有斷點。黑先，切斷它們。', diagram: [E, E, E, E, '...OX....', '....O....', E, E, E], type: 'point', answers: ['D4'], hints: ['兩顆斜放的子之間有兩個連接點，一個已被黑佔。', '下在 D4。'], explain: '黑 D4 把白分成兩塊，白要分別照顧兩邊，戰鬥就對黑有利了。這就是「棋從斷處生」。' },
      ],
    },
  ];

  const TEN_RULES = [
    ['不得貪勝', '越想贏越容易急躁出錯。領先時穩健收束，不要冒不必要的險。'],
    ['入界宜緩', '打入對方勢力範圍時要輕巧，留有餘地，不要一頭撞進去。'],
    ['攻彼顧我', '攻擊對方之前，先看看自己有沒有弱點。'],
    ['棄子爭先', '捨棄不重要的子，換取先手去下更大的地方。'],
    ['捨小就大', '永遠比較大小：小利益讓給對方，自己去下最大的一手。'],
    ['逢危須棄', '救不活的棋就果斷放棄，越救損失越大（例如被征吃的子）。'],
    ['慎勿輕速', '不要不假思索就落子。下快棋也要先看一眼全局。'],
    ['動須相應', '每一手都要與周圍的子互相呼應，形成整體。'],
    ['彼強自保', '對方強的地方別硬碰，先把自己的棋走厚。'],
    ['勢孤取和', '自己孤立無援時，不求大勝，先求安定、和平處理。'],
  ];
  const SAYINGS = [
    ['金角銀邊草肚皮', '圍同樣的地，角上用子最少，邊上次之，中央最多。開局先角、後邊、再中腹。'],
    ['敵之要點即我之要點', '對方最想下的地方，往往也是你最該下的地方。死活、布局都適用。'],
    ['棋從斷處生', '有斷點就有戰鬥。切斷對方，或補好自己的斷點，常是局面的轉捩點。'],
    ['二子頭必扳', '兩子並排相對時，扳住對方的頭，能壓低對方並擴張自己。'],
    ['立二拆三', '在邊上有兩顆直立的子時，向旁邊拆三路最安定、效率又好。'],
    ['征子不利莫征子', '征子前先看路上有沒有對方的子，否則只會越追越虧。'],
    ['左右同型走中央', '左右對稱的形狀，要點通常在正中間。'],
    ['厚勢不圍空', '厚實的棋應該用來攻擊，而不是緊貼著圍小地。'],
  ];

  // ---------- Storage ----------
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveProgress(p) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(p));
    } catch (e) {
      // Progress is a convenience only; ignore storage failures.
    }
  }
  const progress = loadProgress();

  // ---------- Board rendering ----------
  const CELL = 40, MARGIN = 34;
  const VIEW = MARGIN * 2 + CELL * (SIZE - 1);
  const STAR = [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]];
  const px = (i) => MARGIN + i * CELL;

  function renderBoard(container, opts) {
    const { board, last, area, answer, owner, ghost } = opts;
    // Gradient ids must be unique per board: a hidden board's defs would not render.
    const id = container.id;
    let s = `<svg viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="棋盤">`;
    s += `<defs>
      <linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8c36a"/><stop offset=".5" stop-color="#d8a95a"/><stop offset="1" stop-color="#c9974a"/></linearGradient>
      <radialGradient id="${id}-gB" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#5a5a5a"/><stop offset=".4" stop-color="#1a1a1a"/><stop offset="1" stop-color="#000"/></radialGradient>
      <radialGradient id="${id}-gW" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#f1f1f1"/><stop offset="1" stop-color="#cfcfcf"/></radialGradient>
      <filter id="${id}-sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-opacity=".4"/></filter>
    </defs>`;
    s += `<rect width="${VIEW}" height="${VIEW}" rx="14" fill="url(#${id}-wood)"/>`;
    for (let i = 0; i < SIZE; i++) {
      s += `<line x1="${px(0)}" y1="${px(i)}" x2="${px(SIZE - 1)}" y2="${px(i)}" stroke="#3b2a14" stroke-width="${i === 0 || i === SIZE - 1 ? 1.6 : 0.9}"/>`;
      s += `<line x1="${px(i)}" y1="${px(0)}" x2="${px(i)}" y2="${px(SIZE - 1)}" stroke="#3b2a14" stroke-width="${i === 0 || i === SIZE - 1 ? 1.6 : 0.9}"/>`;
      const col = 'ABCDEFGHJ'[i];
      s += `<text x="${px(i)}" y="${MARGIN - 16}" font-size="11" text-anchor="middle" fill="#5b4320">${col}</text>`;
      s += `<text x="${px(i)}" y="${VIEW - MARGIN + 24}" font-size="11" text-anchor="middle" fill="#5b4320">${col}</text>`;
      s += `<text x="${MARGIN - 18}" y="${px(i) + 4}" font-size="11" text-anchor="middle" fill="#5b4320">${SIZE - i}</text>`;
      s += `<text x="${VIEW - MARGIN + 18}" y="${px(i) + 4}" font-size="11" text-anchor="middle" fill="#5b4320">${SIZE - i}</text>`;
    }
    for (const [x, y] of STAR) s += `<circle cx="${px(x)}" cy="${px(y)}" r="3" fill="#3b2a14"/>`;
    if (area) {
      for (const [x, y] of area) s += `<rect x="${px(x) - CELL / 2}" y="${px(y) - CELL / 2}" width="${CELL}" height="${CELL}" fill="var(--hint)"/>`;
    }
    if (owner) {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (board[y][x] !== EMPTY || !owner[y][x]) continue;
          s += `<rect x="${px(x) - 7}" y="${px(y) - 7}" width="14" height="14" rx="2" fill="${owner[y][x] === BLACK ? '#111' : '#fafafa'}" opacity=".7" stroke="#0004" stroke-width=".5"/>`;
        }
      }
    }
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const v = board[y][x];
        if (v === EMPTY) continue;
        s += `<circle cx="${px(x)}" cy="${px(y)}" r="18" fill="url(#${id}-${v === BLACK ? 'gB' : 'gW'})" filter="url(#${id}-sh)"/>`;
      }
    }
    if (last) {
      const c = board[last[1]][last[0]] === BLACK ? '#fff' : '#111';
      s += `<circle cx="${px(last[0])}" cy="${px(last[1])}" r="6" fill="none" stroke="${c}" stroke-width="2"/>`;
    }
    if (answer) {
      s += `<circle cx="${px(answer[0])}" cy="${px(answer[1])}" r="15" fill="none" stroke="#b45309" stroke-width="3" stroke-dasharray="5 4">
        <animate attributeName="r" values="13;17;13" dur="1.4s" repeatCount="indefinite"/></circle>`;
    }
    if (ghost) s += `<circle class="ghost" cx="0" cy="0" r="18" fill="url(#${id}-${ghost === BLACK ? 'gB' : 'gW'})" opacity="0" pointer-events="none"/>`;
    s += '</svg>';
    container.innerHTML = s;
  }

  function pointFromEvent(svg, ev) {
    const rect = svg.getBoundingClientRect();
    const vx = ((ev.clientX - rect.left) / rect.width) * VIEW;
    const vy = ((ev.clientY - rect.top) / rect.height) * VIEW;
    const x = Math.round((vx - MARGIN) / CELL);
    const y = Math.round((vy - MARGIN) / CELL);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return [x, y];
  }
  function bindBoard(container, getBoard, onPlay) {
    container.addEventListener('click', (ev) => {
      const svg = container.querySelector('svg');
      const p = svg && pointFromEvent(svg, ev);
      if (p) onPlay(p[0], p[1]);
    });
    container.addEventListener('pointermove', (ev) => {
      const svg = container.querySelector('svg');
      const ghost = svg && svg.querySelector('.ghost');
      if (!ghost) return;
      const p = pointFromEvent(svg, ev);
      const board = getBoard();
      if (p && board[p[1]][p[0]] === EMPTY) {
        ghost.setAttribute('cx', px(p[0]));
        ghost.setAttribute('cy', px(p[1]));
        ghost.setAttribute('opacity', '0.45');
      } else ghost.setAttribute('opacity', '0');
    });
    container.addEventListener('pointerleave', () => {
      const ghost = container.querySelector('.ghost');
      if (ghost) ghost.setAttribute('opacity', '0');
    });
  }
  function areaAround(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) out.push([nx, ny]);
      }
    }
    return out;
  }
  const coord = (x, y) => G.toCoord(x, y, SIZE);
  const $ = (id) => document.getElementById(id);

  // ---------- Tabs ----------
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      ['lessons', 'practice', 'proverbs'].forEach((v) => { $('view-' + v).hidden = v !== tab.dataset.view; });
      if (tab.dataset.view === 'practice') drawPractice();
    });
  });

  // ---------- Lessons view ----------
  const ps = { lesson: 0, index: 0, board: null, ko: null, last: null, status: 'playing', hintLevel: 0 };
  const currentProblem = () => LESSONS[ps.lesson].problems[ps.index];
  const problemId = (l, i) => LESSONS[l].id + '-' + i;

  function renderLessonList() {
    $('lesson-list').innerHTML = LESSONS.map((l, i) => {
      const solved = l.problems.filter((_, j) => progress[problemId(i, j)]).length;
      return `<li><button data-lesson="${i}" aria-current="${i === ps.lesson}"><span>${l.title}</span><span class="count">${solved}/${l.problems.length}</span></button></li>`;
    }).join('');
    $('lesson-list').querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => openLesson(Number(b.dataset.lesson), 0));
    });
  }
  function openLesson(l, i) {
    ps.lesson = l;
    const lesson = LESSONS[l];
    $('lesson-intro').innerHTML = `<h2>${lesson.title}</h2>${lesson.intro.map((p) => `<p>${p}</p>`).join('')}<div class="essence">${lesson.essence}</div>`;
    openProblem(i);
  }
  function openProblem(i) {
    ps.index = i;
    const p = currentProblem();
    ps.board = G.parseDiagram(p.diagram);
    ps.ko = null;
    ps.last = null;
    ps.status = 'playing';
    ps.hintLevel = 0;
    $('problem-title').textContent = p.title;
    $('problem-prompt').textContent = p.prompt;
    setFeedback('problem-feedback', '', '黑先。點擊棋盤落子。');
    renderLessonList();
    drawProblem();
  }
  function drawProblem() {
    const p = currentProblem();
    const ans = G.fromCoord(p.answers[0], SIZE);
    renderBoard($('problem-board'), {
      board: ps.board,
      last: ps.last,
      area: ps.hintLevel >= 1 && ps.status !== 'solved' ? areaAround(ans[0], ans[1]) : null,
      answer: ps.hintLevel >= 2 && ps.status !== 'solved' ? ans : null,
      ghost: ps.status === 'playing' ? BLACK : null,
    });
    const lesson = LESSONS[ps.lesson];
    $('problem-dots').innerHTML = lesson.problems.map((_, j) => {
      const done = progress[problemId(ps.lesson, j)];
      return `<button class="dot ${done ? 'solved' : ''}" data-i="${j}" aria-current="${j === ps.index}" title="第 ${j + 1} 題">${j + 1}</button>`;
    }).join('');
    $('problem-dots').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => openProblem(Number(b.dataset.i))));
    const hints = p.hints.length;
    $('btn-hint').textContent = ps.hintLevel >= hints ? '💡 提示（已全部顯示）' : `💡 提示 ${ps.hintLevel + 1}/${hints}`;
    $('btn-hint').disabled = ps.status === 'solved';
    const last = ps.lesson === LESSONS.length - 1 && ps.index === lesson.problems.length - 1;
    $('btn-next').disabled = last;
  }
  function setFeedback(id, kind, html) {
    const el = $(id);
    el.className = 'feedback' + (kind ? ' ' + kind : '');
    el.innerHTML = html;
  }
  function solve() {
    const p = currentProblem();
    ps.status = 'solved';
    const stars = Math.max(1, 3 - ps.hintLevel);
    const id = problemId(ps.lesson, ps.index);
    progress[id] = Math.max(progress[id] || 0, stars);
    saveProgress(progress);
    setFeedback('problem-feedback', 'good', `<strong>正確！</strong> <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span><br>${p.explain}`);
  }
  function fail(msg) {
    ps.status = 'failed';
    setFeedback('problem-feedback', 'bad', `${msg}<br>按「重來」再試一次，或用「提示」找方向。`);
  }
  function onProblemClick(x, y) {
    if (ps.status !== 'playing') return;
    const p = currentProblem();
    const r = G.play(ps.board, x, y, BLACK, ps.ko);
    if (!r.legal) {
      setFeedback('problem-feedback', 'bad', r.reason);
      return;
    }
    ps.board = r.board;
    ps.ko = r.ko;
    ps.last = [x, y];
    const here = coord(x, y);

    if (p.type === 'point') {
      if (p.answers.includes(here)) solve();
      else fail((p.wrong && p.wrong[here]) || `${here} 不是最好的一手。`);
    } else if (p.type === 'escape') {
      const [tx, ty] = G.fromCoord(p.target, SIZE);
      if (ps.board[ty][tx] === BLACK && !G.canCapture(ps.board, tx, ty, true, 16, ps.ko)) solve();
      else fail(`${here} 之後，黑棋還是會被吃掉。`);
    } else if (p.type === 'capture') {
      const [tx, ty] = G.fromCoord(p.target, SIZE);
      if (ps.board[ty][tx] === EMPTY) {
        solve();
      } else {
        const d = G.bestDefense(ps.board, tx, ty, ps.ko, 16);
        if (!d) {
          setFeedback('problem-feedback', '', '白棋無路可走，繼續。');
        } else {
          ps.status = 'waiting';
          setTimeout(() => {
            ps.board = d.result.board;
            ps.ko = d.result.ko;
            ps.last = [d.x, d.y];
            const reply = coord(d.x, d.y);
            if (d.escapes) {
              fail(`白 ${reply} 應，白棋已經逃出去了。`);
            } else {
              ps.status = 'playing';
              const caught = d.result.captured.length ? `，提掉黑 ${d.result.captured.length} 子` : '';
              setFeedback('problem-feedback', '', `白 ${reply} 應${caught}。白棋仍在危險中，繼續追！`);
            }
            drawProblem();
          }, 380);
        }
      }
    }
    drawProblem();
  }
  bindBoard($('problem-board'), () => ps.board, onProblemClick);
  $('btn-hint').addEventListener('click', () => {
    const p = currentProblem();
    if (ps.status === 'solved' || ps.hintLevel >= p.hints.length) return;
    ps.hintLevel++;
    if (ps.status === 'failed') {
      ps.board = G.parseDiagram(p.diagram);
      ps.ko = null;
      ps.last = null;
      ps.status = 'playing';
    }
    setFeedback('problem-feedback', 'hint', `💡 ${p.hints.slice(0, ps.hintLevel).join('<br>💡 ')}`);
    drawProblem();
  });
  $('btn-reset').addEventListener('click', () => {
    const level = ps.hintLevel;
    openProblem(ps.index);
    ps.hintLevel = level;
    drawProblem();
  });
  $('btn-next').addEventListener('click', () => {
    const lesson = LESSONS[ps.lesson];
    if (ps.index + 1 < lesson.problems.length) openProblem(ps.index + 1);
    else if (ps.lesson + 1 < LESSONS.length) openLesson(ps.lesson + 1, 0);
  });

  // ---------- Practice view ----------
  const KOMI = 6.5;
  let game;
  function newGame() {
    game = {
      board: G.createBoard(SIZE), ko: null, last: null, turn: BLACK, moveNum: 0,
      capB: 0, capW: 0, passes: 0, over: false, history: [], hintLevel: 0, showOwner: false,
    };
    $('practice-log').innerHTML = '';
    setFeedback('practice-feedback', '', '黑先。開局先想想：哪裡是最有價值的地方？');
    drawPractice();
  }
  function snapshot() {
    const { board, ko, last, turn, moveNum, capB, capW, passes } = game;
    game.history.push({ board, ko, last, turn, moveNum, capB, capW, passes });
  }
  function logLine(kind, html) {
    const li = document.createElement('li');
    if (kind) li.className = kind;
    li.innerHTML = html;
    $('practice-log').prepend(li);
  }
  function drawPractice() {
    if (!game) return;
    let owner = null;
    if (game.over) owner = G.territory(game.board);
    else if (game.showOwner) owner = G.influence(game.board);
    let area = null, answer = null;
    if (game.hint && !game.over) {
      area = areaAround(game.hint.x, game.hint.y);
      if (game.hintLevel >= 2) answer = [game.hint.x, game.hint.y];
    }
    renderBoard($('practice-board'), {
      board: game.board, last: game.last, owner, area, answer,
      ghost: !game.over && game.turn === BLACK ? BLACK : null,
    });
    $('pr-move').textContent = game.moveNum;
    $('pr-caps').textContent = `${game.capB} / ${game.capW}`;
    $('pr-hint').disabled = game.over || game.turn !== BLACK;
    $('pr-undo').disabled = !game.history.length;
    $('pr-pass').disabled = game.over || game.turn !== BLACK;
    $('pr-territory').textContent = game.showOwner ? '關閉形勢' : '形勢判斷';
  }
  function describeMove(m) {
    return m && m.main ? m.main.text : '平穩的一手';
  }
  function reviewMove(analysis, x, y) {
    if (!$('pr-review').checked || !analysis.length) return;
    const best = analysis[0];
    const played = analysis.find((m) => m.x === x && m.y === y);
    if (!played) return;
    const here = coord(x, y);
    const bad = played.reasons.find((q) => ['selfatari', 'futile', 'eye', 'weak'].includes(q.tag));
    if (bad) {
      logLine('warn', `⚠ ${here}：${PRINCIPLES[bad.tag]}`);
      return;
    }
    const urgent = best.main && ['capture', 'save', 'kill', 'net'].includes(best.main.tag);
    if (best.x === x && best.y === y && best.score >= 20) {
      logLine('good', `👍 ${here} 好棋！${describeMove(played)}。`);
    } else if (urgent && best.score - played.score >= 35) {
      logLine('warn', `💭 ${here} 不錯，但錯過了 ${coord(best.x, best.y)}：${describeMove(best)}。${PRINCIPLES[best.main.tag]}`);
    } else if (best.score - played.score >= 30 && best.main) {
      logLine('', `💭 也可以考慮 ${coord(best.x, best.y)}（${describeMove(best)}）。`);
    }
  }
  function applyMove(x, y, color) {
    const r = G.play(game.board, x, y, color, game.ko);
    if (!r.legal) return r;
    snapshot();
    game.board = r.board;
    game.ko = r.ko;
    game.last = [x, y];
    game.moveNum++;
    game.passes = 0;
    if (color === BLACK) game.capB += r.captured.length;
    else game.capW += r.captured.length;
    game.turn = G.other(color);
    return r;
  }
  function onPracticeClick(x, y) {
    if (game.over || game.turn !== BLACK) return;
    const analysis = analyzeMoves(game.board, BLACK, game.ko, game.moveNum);
    const r = applyMove(x, y, BLACK);
    if (!r.legal) {
      setFeedback('practice-feedback', 'bad', r.reason);
      return;
    }
    game.hint = null;
    game.hintLevel = 0;
    if (r.captured.length) setFeedback('practice-feedback', 'good', `提掉白 ${r.captured.length} 子！`);
    else setFeedback('practice-feedback', '', '白棋思考中…');
    reviewMove(analysis, x, y);
    drawPractice();
    setTimeout(aiMove, 420);
  }
  function aiMove() {
    if (game.over || game.turn !== WHITE) return;
    const analysis = analyzeMoves(game.board, WHITE, game.ko, game.moveNum);
    const easy = $('pr-level').value === 'easy';
    const pool = analysis.filter((m) => m.score > -10 && m.score >= analysis[0].score - (easy ? 40 : 6));
    if (!pool.length || analysis[0].score < -10) {
      pass(WHITE);
      return;
    }
    const pick = pool[Math.floor(Math.random() * Math.min(pool.length, easy ? 6 : 2))];
    const r = applyMove(pick.x, pick.y, WHITE);
    const why = pick.main ? pick.main.text.replace(/^\S+\s/, '') : '穩健的一手';
    logLine('ai', `白 ${coord(pick.x, pick.y)}：${why}${r.captured.length ? `（提黑 ${r.captured.length} 子）` : ''}`);
    warnThreats();
    drawPractice();
  }
  function warnThreats() {
    const threatened = [];
    const seen = new Set();
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (game.board[y][x] !== BLACK || seen.has(x + ',' + y)) continue;
        const g = G.getGroup(game.board, x, y);
        g.stones.forEach(([sx, sy]) => seen.add(sx + ',' + sy));
        if (g.libs.length === 1) threatened.push(g);
      }
    }
    if (threatened.length) {
      const g = threatened.sort((a, b) => b.stones.length - a.stones.length)[0];
      const [sx, sy] = g.stones[0];
      setFeedback('practice-feedback', 'bad', `注意！黑 ${coord(sx, sy)} 等 ${g.stones.length} 子被叫吃了。先判斷：逃得掉嗎？`);
    } else {
      setFeedback('practice-feedback', '', '輪到黑棋。');
    }
  }
  function pass(color) {
    snapshot();
    game.passes++;
    game.ko = null;
    game.last = null;
    game.turn = G.other(color);
    logLine(color === WHITE ? 'ai' : '', `${color === BLACK ? '黑' : '白'}虛著`);
    if (game.passes >= 2) endGame();
    else if (color === BLACK) setTimeout(aiMove, 300);
    else setFeedback('practice-feedback', '', '白棋虛著。如果你也覺得沒有地方可下了，就虛著結束對局。');
    drawPractice();
  }
  function endGame() {
    game.over = true;
    const t = G.countOwner(game.board, G.territory(game.board));
    const black = t.b + game.capB;
    const white = t.w + game.capW + KOMI;
    const diff = black - white;
    setFeedback('practice-feedback', diff > 0 ? 'good' : 'bad',
      `終局：黑 ${black} 目，白 ${white} 目（含貼目 ${KOMI}）。<strong>${diff > 0 ? '黑' : '白'}勝 ${Math.abs(diff)} 目</strong><br><span class="muted">簡易計目：只計算完全被一方包圍的空點，死子請在終局前提掉。</span>`);
    drawPractice();
  }
  bindBoard($('practice-board'), () => game.board, onPracticeClick);
  $('pr-hint').addEventListener('click', () => {
    if (game.over || game.turn !== BLACK) return;
    if (!game.hint) {
      const analysis = analyzeMoves(game.board, BLACK, game.ko, game.moveNum);
      game.hint = analysis[0];
    }
    game.hintLevel = Math.min(2, game.hintLevel + 1);
    const h = game.hint;
    if (!h) return;
    const principle = h.main ? PRINCIPLES[h.main.tag] : '';
    if (game.hintLevel === 1) {
      setFeedback('practice-feedback', 'hint', `💡 方向：看看黃色區域。${principle}<br><span class="muted">再按一次會顯示確切落點。</span>`);
    } else {
      setFeedback('practice-feedback', 'hint', `💡 建議 <strong>${coord(h.x, h.y)}</strong>：${describeMove(h)}。<br>${principle}`);
    }
    drawPractice();
  });
  $('pr-undo').addEventListener('click', () => {
    if (!game.history.length) return;
    let s = game.history.pop();
    while (s.turn !== BLACK && game.history.length) s = game.history.pop();
    Object.assign(game, s, { over: false, hint: null, hintLevel: 0 });
    logLine('', '↶ 悔棋');
    setFeedback('practice-feedback', '', '已悔棋，輪到黑棋。');
    drawPractice();
  });
  $('pr-pass').addEventListener('click', () => {
    if (!game.over && game.turn === BLACK) pass(BLACK);
  });
  $('pr-territory').addEventListener('click', () => {
    game.showOwner = !game.showOwner;
    if (game.showOwner && !game.over) {
      const t = G.countOwner(game.board, G.influence(game.board));
      setFeedback('practice-feedback', '', `形勢估計：黑約 ${t.b + game.capB} 目，白約 ${t.w + game.capW} 目＋貼目 ${KOMI}。<br><span class="muted">方塊表示目前勢力範圍，只是粗估。</span>`);
    }
    drawPractice();
  });
  $('pr-new').addEventListener('click', newGame);

  // ---------- Proverbs view ----------
  const card = ([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`;
  $('ten-rules').innerHTML = TEN_RULES.map(card).join('');
  $('sayings').innerHTML = SAYINGS.map(card).join('');

  newGame();
  openLesson(0, 0);
})();
