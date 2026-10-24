// Browser host = "server" game. Set soalan, jawapan betul dan skor hanya
// wujud di sini; phone player cuma terima soalan dan 4 pilihan.
(async function () {
  const $ = id => document.getElementById(id);
  const SHAPES = ['▲', '◆', '●', '■'];
  const MAX_PLAYERS = 60;

  let sets = [];
  let peer = null, pin = '';
  let players = new Map();      // pid -> pemain
  let questions = [], qi = -1, qStart = 0, tick = null;
  let cfg = null, phase = 'setup';

  // ---------- Setup ----------
  sets = await MKQ.allSets();
  sets.forEach((s, i) => $('set').append(new Option(`${s.name} (${s.items.length} ${s.unit || 'kalimah'})`, i)));
  const saved = MKQ.load('hostcfg', null);
  if (saved) {
    const idx = sets.findIndex(s => s.id === saved.setId);
    if (idx > -1) $('set').value = idx;
    ['mode', 'count', 'time'].forEach(k => { if (saved[k]) $(k).value = saved[k]; });
  } else {
    $('count').value = '20'; $('time').value = '20';
  }

  $('btn-open').onclick = () => {
    const set = sets[$('set').value];
    if (!set || set.items.length < 4) return setupMsg('Set soalan perlu sekurang-kurangnya 4 kalimah.');
    cfg = { set, mode: $('mode').value, count: $('count').value, time: Number($('time').value) };
    MKQ.save('hostcfg', { setId: set.id, mode: cfg.mode, count: cfg.count, time: String(cfg.time) });
    openLobby();
  };

  function setupMsg(t) { $('setup-msg').textContent = t; }

  function openLobby() {
    $('btn-open').disabled = true;
    setupMsg('Menyambung…');
    pin = String(Math.floor(100000 + Math.random() * 900000));
    peer = new Peer(MKQ.PEER_PREFIX + pin);
    peer.on('open', () => {
      phase = 'lobby';
      $('pin').textContent = pin;
      const url = new URL('play.html?pin=' + pin, location.href).href;
      $('join-url').textContent = url.replace(/^https?:\/\//, '').replace(/\?.*$/, '');
      $('qr').textContent = '';
      if (window.QRCode) new QRCode($('qr'), { text: url, width: 150, height: 150 });
      renderLobby();
      MKQ.show('s-lobby');
    });
    peer.on('connection', setupConn);
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') { peer.destroy(); openLobby(); return; }
      console.warn('PeerJS:', err.type, err);
      if (phase === 'setup') {
        $('btn-open').disabled = false;
        setupMsg('Gagal sambung (' + err.type + '). Semak internet dan cuba lagi.');
      }
    });
  }

  // ---------- Sambungan ----------
  function setupConn(conn) {
    conn.on('data', m => onMsg(conn, m));
    conn.on('close', () => {
      const p = byConn(conn);
      if (!p) return;
      p.online = false;
      renderLobby();
      maybeAllAnswered();
    });
  }

  function byConn(conn) { return [...players.values()].find(p => p.conn === conn); }
  function online() { return [...players.values()].filter(p => p.online); }
  function send(p, m) { if (p.online && p.conn && p.conn.open) { try { p.conn.send(m); } catch {} } }
  function reply(conn, m) { try { conn.send(m); } catch {} }

  function onMsg(conn, m) {
    if (!m || typeof m !== 'object') return;

    if (m.t === 'join') {
      if (phase === 'final' || phase === 'setup') return reply(conn, { t: 'error', msg: 'Game ini dah tamat.' });
      let p = typeof m.pid === 'string' ? players.get(m.pid) : null;
      if (p) {
        // Pemain sambung semula: skor dikekalkan
        if (p.conn && p.conn !== conn) { try { p.conn.close(); } catch {} }
        p.conn = conn; p.online = true;
      } else {
        const name = String(m.name || '').replace(/\s+/g, ' ').trim().slice(0, 15);
        if (!name) return reply(conn, { t: 'error', msg: 'Sila isi nama.' });
        if ([...players.values()].some(x => x.name.toLowerCase() === name.toLowerCase()))
          return reply(conn, { t: 'error', msg: 'Nama itu dah diambil. Cuba nama lain.' });
        if (players.size >= MAX_PLAYERS) return reply(conn, { t: 'error', msg: 'Game dah penuh.' });
        p = { pid: MKQ.uid(), name, avatar: AVATAR.sanitize(m.avatar), score: 0, streak: 0, answer: null, last: null, conn, online: true };
        players.set(p.pid, p);
      }
      send(p, { t: 'joined', pid: p.pid, name: p.name, avatar: p.avatar, score: p.score });
      if (phase === 'question') sendQuestion(p);
      renderLobby();
      return;
    }

    if (m.t === 'answer') {
      const p = byConn(conn);
      if (!p || phase !== 'question' || m.q !== qi || p.answer) return;
      const c = Number(m.choice);
      if (!Number.isInteger(c) || c < 0 || c >= questions[qi].choices.length) return;
      p.answer = { choice: c, ms: Date.now() - qStart };
      $('q-answered').textContent = answeredCount();
      maybeAllAnswered();
    }
  }

  // ---------- Lobby ----------
  function renderLobby() {
    const list = [...players.values()];
    $('pcount').textContent = online().length;
    $('btn-start').disabled = online().length === 0;
    $('lobby-empty').style.display = list.length ? 'none' : '';
    const grid = $('lobby-players');
    grid.textContent = '';
    list.forEach(p => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (p.online ? '' : ' offline');
      chip.innerHTML = AVATAR.svg(p.avatar); // SVG dari kepingan tetap sahaja
      const nm = document.createElement('div');
      nm.className = 'name';
      nm.textContent = p.name;
      chip.append(nm);
      chip.title = 'Keluarkan ' + p.name;
      chip.onclick = () => kick(p);
      grid.append(chip);
    });
  }

  function kick(p) {
    if (phase !== 'lobby') return;
    if (!confirm(`Keluarkan "${p.name}" dari game?`)) return;
    send(p, { t: 'kicked' });
    setTimeout(() => { try { p.conn.close(); } catch {} }, 300);
    players.delete(p.pid);
    renderLobby();
  }

  $('btn-start').onclick = () => {
    questions = MKQ.buildQuestions(cfg.set.items, { mode: cfg.mode, count: cfg.count, labels: cfg.set.labels });
    players.forEach(p => { p.score = 0; p.streak = 0; p.last = null; });
    qi = -1;
    nextQuestion();
  };

  // ---------- Soalan ----------
  function answeredCount() { return [...players.values()].filter(p => p.answer).length; }

  function sendQuestion(p) {
    const q = questions[qi];
    send(p, {
      t: 'question', q: qi, n: questions.length, mode: q.mode, label: q.label, surah: q.surah,
      prompt: q.prompt, choices: q.choices, left: Math.max(0, cfg.time * 1000 - (Date.now() - qStart))
    });
  }

  function nextQuestion() {
    qi++;
    if (qi >= questions.length) return finish();
    phase = 'question';
    players.forEach(p => { p.answer = null; });
    const q = questions[qi];
    qStart = Date.now();

    $('q-num').textContent = `Soalan ${qi + 1} / ${questions.length}`;
    $('q-label').textContent = q.label;
    $('q-surah').textContent = q.surah;
    $('q-prompt').textContent = q.prompt;
    MKQ.sizeText($('q-prompt'), q.prompt, 22, 60);
    $('q-answered').textContent = '0';
    $('btn-q').textContent = 'Tamatkan masa';
    const box = $('q-answers');
    box.className = 'answers';
    box.textContent = '';
    q.choices.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'ans a' + i;
      const sh = document.createElement('span'); sh.className = 'shape'; sh.textContent = SHAPES[i];
      const tx = document.createElement('span'); tx.className = 'txt ar'; tx.textContent = c;
      MKQ.sizeText(d, c, 40, 90);
      d.append(sh, tx);
      box.append(d);
    });

    players.forEach(sendQuestion);
    updateTimer();
    clearInterval(tick);
    tick = setInterval(updateTimer, 200);
    MKQ.show('s-question');
  }

  function updateTimer() {
    const left = Math.ceil((cfg.time * 1000 - (Date.now() - qStart)) / 1000);
    $('q-timer').textContent = Math.max(left, 0);
    $('q-timer').classList.toggle('low', left <= 5);
    if (left <= 0) endQuestion();
  }

  function maybeAllAnswered() {
    if (phase !== 'question') return;
    const on = online();
    if (on.length && on.every(p => p.answer)) endQuestion();
  }

  $('btn-q').onclick = () => {
    if (phase === 'question') endQuestion();
    else if (phase === 'reveal') showBoard();
  };

  function ranked() { return [...players.values()].sort((a, b) => b.score - a.score); }

  function endQuestion() {
    if (phase !== 'question') return;
    phase = 'reveal';
    clearInterval(tick);
    const q = questions[qi];
    const counts = [0, 0, 0, 0];

    players.forEach(p => {
      if (p.answer) counts[p.answer.choice]++;
      const ok = !!p.answer && p.answer.choice === q.correct;
      let pts = 0;
      if (ok) { p.streak++; pts = MKQ.points(p.answer.ms, cfg.time * 1000, p.streak); }
      else p.streak = 0;
      p.score += pts;
      p.last = { ok, pts, answered: !!p.answer };
    });

    const r = ranked();
    r.forEach((p, i) => send(p, {
      t: 'result', ok: p.last.ok, answered: p.last.answered, pts: p.last.pts, score: p.score,
      rank: i + 1, of: r.length, streak: p.streak, correct: q.choices[q.correct]
    }));

    const box = $('q-answers');
    box.classList.add('revealed');
    [...box.children].forEach((d, i) => {
      d.classList.add(i === q.correct ? 'right' : 'wrong');
      const c = document.createElement('span'); c.className = 'count'; c.textContent = counts[i];
      d.append(c);
    });
    $('q-timer').textContent = '✓';
    $('q-timer').classList.remove('low');
    $('btn-q').textContent = 'Papan Markah ▶';
  }

  function boardRow(p, i) {
    const row = document.createElement('div');
    row.className = 'board-row';
    row.style.animationDelay = (i * 0.07) + 's';
    const rk = document.createElement('span'); rk.className = 'rank'; rk.textContent = i + 1;
    const av = document.createElement('span'); av.innerHTML = AVATAR.svg(p.avatar);
    const nm = document.createElement('span'); nm.className = 'name'; nm.textContent = p.name;
    const st = document.createElement('span'); st.className = 'streak'; st.textContent = p.streak >= 2 ? `🔥${p.streak}` : '';
    const sc = document.createElement('span'); sc.textContent = p.score;
    row.append(rk, av, nm, st, sc);
    return row;
  }

  function showBoard() {
    phase = 'board';
    const b = $('board');
    b.textContent = '';
    ranked().slice(0, 5).forEach((p, i) => b.append(boardRow(p, i)));
    $('btn-board').textContent = qi + 1 >= questions.length ? 'Keputusan Akhir 🏆' : 'Soalan Seterusnya ▶';
    MKQ.show('s-board');
  }
  $('btn-board').onclick = nextQuestion;

  // ---------- Tamat ----------
  function finish() {
    phase = 'final';
    const r = ranked();
    const pod = $('podium');
    pod.textContent = '';
    [1, 0, 2].forEach(i => {
      const p = r[i];
      if (!p) return;
      const col = document.createElement('div');
      col.className = 'podium-col p' + (i + 1);
      const av = document.createElement('div'); av.innerHTML = AVATAR.svg(p.avatar);
      const nm = document.createElement('div'); nm.className = 'name'; nm.textContent = p.name;
      const sc = document.createElement('div'); sc.className = 'score'; sc.textContent = p.score + ' mata';
      const bl = document.createElement('div'); bl.className = 'podium-block'; bl.textContent = i + 1;
      col.append(av, nm, sc, bl);
      pod.append(col);
    });
    const list = $('final-list');
    list.textContent = '';
    r.slice(3).forEach((p, i) => list.append(boardRow(p, i + 3)));

    r.forEach((p, i) => send(p, { t: 'end', rank: i + 1, of: r.length, score: p.score }));

    const hist = MKQ.load('history', []);
    hist.unshift({
      date: new Date().toISOString(), set: cfg.set.name, questions: questions.length,
      top: r.slice(0, 3).map(p => ({ name: p.name, score: p.score })), players: r.length
    });
    MKQ.save('history', hist.slice(0, 20));
    MKQ.show('s-final');
  }

  $('btn-again').onclick = () => {
    [...players.values()].forEach(p => { if (!p.online) players.delete(p.pid); });
    players.forEach(p => { p.score = 0; p.streak = 0; p.answer = null; p.last = null; send(p, { t: 'lobby' }); });
    phase = 'lobby';
    renderLobby();
    MKQ.show('s-lobby');
  };

  window.addEventListener('beforeunload', e => {
    if (phase !== 'setup' && phase !== 'final' && players.size) { e.preventDefault(); e.returnValue = ''; }
  });
})();
