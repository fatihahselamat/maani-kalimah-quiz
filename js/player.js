// Phone player: sambung ke browser host guna PIN, hantar jawapan.
(function () {
  const $ = id => document.getElementById(id);
  const SHAPES = ['▲', '◆', '●', '■'];

  let peer = null, conn = null;
  let pin = '', name = '', avatar = AVATAR.sanitize(MKQ.load('avatar', AVATAR.random()));
  let curQ = -1, answered = false, deadline = 0, tick = null;
  let finished = false; // dikeluarkan / game tamat: jangan tunjuk "terputus"

  // ---------- Langkah 1: PIN + nama ----------
  const params = new URLSearchParams(location.search);
  $('pin').value = (params.get('pin') || '').replace(/\D/g, '').slice(0, 6);
  $('name').value = MKQ.load('name', '');
  ($('pin').value ? $('name') : $('pin')).focus();

  function joinMsg(t) { $('join-msg').textContent = t; }

  $('btn-next').onclick = () => {
    pin = $('pin').value.replace(/\D/g, '');
    name = $('name').value.replace(/\s+/g, ' ').trim().slice(0, 15);
    if (pin.length !== 6) return joinMsg('PIN mesti 6 digit.');
    if (!name) return joinMsg('Sila isi nama kau.');
    joinMsg('');
    MKQ.save('name', name);
    renderAvatarBuilder();
    MKQ.show('s-avatar');
  };
  ['pin', 'name'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-next').click(); }));

  // ---------- Langkah 2: avatar ----------
  function renderAvatarBuilder() {
    $('preview').innerHTML = AVATAR.svg(avatar);
    const box = $('options');
    box.textContent = '';
    AVATAR.KEYS.forEach(k => {
      const row = document.createElement('div');
      row.className = 'opt-row';
      const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = AVATAR.LABELS[k];
      row.append(lbl);
      if (k === 'color') {
        const sw = document.createElement('div'); sw.className = 'swatches';
        AVATAR.colors.forEach((c, i) => {
          const b = document.createElement('button');
          b.className = 'swatch' + (avatar.color === i ? ' on' : '');
          b.style.background = c;
          b.setAttribute('aria-label', 'Warna ' + (i + 1));
          b.onclick = () => { avatar.color = i; changed(); };
          sw.append(b);
        });
        row.append(sw);
      } else {
        const n = AVATAR.parts[k].length;
        const prev = document.createElement('button'); prev.className = 'arrow'; prev.textContent = '‹';
        const val = document.createElement('span'); val.className = 'val'; val.textContent = AVATAR.parts[k][avatar[k]];
        const next = document.createElement('button'); next.className = 'arrow'; next.textContent = '›';
        prev.onclick = () => { avatar[k] = (avatar[k] - 1 + n) % n; changed(); };
        next.onclick = () => { avatar[k] = (avatar[k] + 1) % n; changed(); };
        row.append(prev, val, next);
      }
      box.append(row);
    });
  }
  function changed() { MKQ.save('avatar', avatar); renderAvatarBuilder(); }

  $('btn-random').onclick = () => { avatar = AVATAR.random(); changed(); };
  $('btn-back').onclick = () => MKQ.show('s-join');
  $('btn-join').onclick = connect;
  $('btn-retry').onclick = connect;

  // ---------- Sambungan ----------
  function showWait(status, sub) {
    $('me-avatar').innerHTML = AVATAR.svg(avatar);
    $('me-name').textContent = name;
    $('wait-status').textContent = status;
    $('wait-sub').textContent = sub || '';
    MKQ.show('s-wait');
  }

  function connect() {
    finished = false;
    showWait('Menyambung…');
    if (!peer || peer.destroyed) {
      peer = new Peer();
      peer.on('open', openConn);
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
      peer.on('error', err => {
        console.warn('PeerJS:', err.type, err);
        if (err.type === 'peer-unavailable') {
          MKQ.show('s-join');
          joinMsg('PIN tak dijumpai. Semak semula PIN di skrin host.');
        } else if (!conn || !conn.open) {
          showError('Masalah sambungan (' + err.type + '). Cuba lagi.');
        }
      });
    } else {
      openConn();
    }
  }

  function openConn() {
    if (conn) { try { conn.close(); } catch {} }
    const c = peer.connect(MKQ.PEER_PREFIX + pin, { reliable: true });
    conn = c;
    c.on('open', () => {
      const sess = MKQ.sessionLoad('session', null);
      c.send({ t: 'join', name, avatar, pid: sess && sess.pin === pin ? sess.pid : undefined });
    });
    c.on('data', onMsg);
    c.on('close', () => {
      if (c !== conn || finished) return;
      showError('Sambungan dengan host terputus.');
    });
  }

  function showError(t) {
    clearInterval(tick);
    $('err-msg').textContent = t;
    MKQ.show('s-error');
  }

  // ---------- Mesej dari host ----------
  function onMsg(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'joined':
        MKQ.sessionSave('session', { pin, pid: m.pid });
        name = m.name;
        showWait('Kau dah masuk! 🎉', 'Tengok nama kau di skrin. Tunggu host mulakan game…');
        break;
      case 'error':
        finished = true;
        try { conn.close(); } catch {}
        MKQ.show('s-join');
        joinMsg(m.msg);
        break;
      case 'kicked':
        finished = true;
        MKQ.sessionSave('session', null);
        showError('Host telah keluarkan kau dari game.');
        $('btn-retry').style.display = 'none';
        break;
      case 'lobby':
        finished = false;
        showWait('Game baru!', 'Tunggu host mulakan…');
        break;
      case 'question': showQuestion(m); break;
      case 'result': showResult(m); break;
      case 'end': showEnd(m); break;
    }
  }

  function showQuestion(m) {
    curQ = m.q;
    answered = false;
    $('a-num').textContent = `Soalan ${m.q + 1} / ${m.n}`;
    $('a-label').textContent = m.label;
    $('a-prompt').textContent = m.prompt;
    MKQ.sizeText($('a-prompt'), m.prompt, 20, 60);
    $('a-surah').textContent = m.surah || '';
    const box = $('a-choices');
    box.textContent = '';
    (m.choices || []).forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'ans a' + i;
      const sh = document.createElement('span'); sh.className = 'shape'; sh.textContent = SHAPES[i];
      const tx = document.createElement('span'); tx.className = 'txt ar'; tx.textContent = c;
      MKQ.sizeText(b, c, 40, 90);
      b.append(sh, tx);
      b.onclick = () => answer(i);
      box.append(b);
    });
    deadline = Date.now() + Number(m.left || 0);
    clearInterval(tick);
    updateTimer();
    tick = setInterval(updateTimer, 250);
    MKQ.show('s-answer');
  }

  function updateTimer() {
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    $('a-timer').textContent = '⏱ ' + left;
    if (left <= 0 && !answered) {
      clearInterval(tick);
      answered = true;
      $('sent-status').textContent = 'Masa tamat!';
      MKQ.show('s-sent');
    }
  }

  function answer(i) {
    if (answered) return;
    answered = true;
    clearInterval(tick);
    try { conn.send({ t: 'answer', q: curQ, choice: i }); } catch {}
    $('sent-status').textContent = 'Jawapan dihantar!';
    MKQ.show('s-sent');
  }

  function showResult(m) {
    clearInterval(tick);
    const s = $('s-result');
    s.classList.toggle('ok', !!m.ok);
    s.classList.toggle('bad', !m.ok);
    $('r-icon').textContent = m.ok ? '✅' : (m.answered ? '❌' : '⌛');
    $('r-status').textContent = m.ok ? 'Betul!' : (m.answered ? 'Salah' : 'Tak sempat jawab');
    $('r-pts').textContent = '+' + m.pts;
    $('r-streak').textContent = m.streak >= 2 ? `🔥 Streak ${m.streak} jawapan betul berturut-turut` : '';
    $('r-correct').textContent = '';
    if (!m.ok) {
      $('r-correct').append('Jawapan betul: ');
      const a = document.createElement('span'); a.className = 'ar'; a.style.fontSize = '24px'; a.textContent = m.correct;
      $('r-correct').append(a);
    }
    $('r-rank').textContent = `Tempat #${m.rank} daripada ${m.of} · ${m.score} mata`;
    MKQ.show('s-result');
  }

  function showEnd(m) {
    finished = true;
    clearInterval(tick);
    $('e-icon').textContent = ['🥇', '🥈', '🥉'][m.rank - 1] || '🎉';
    $('e-status').textContent = m.rank <= 3 ? `Tahniah! Tempat ke-${m.rank}` : `Tempat ke-${m.rank} daripada ${m.of}`;
    $('e-score').textContent = `${m.score} mata`;
    MKQ.show('s-end');
  }
})();
