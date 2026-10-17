// Fungsi kongsi: storan, set soalan, jana soalan, kiraan markah.
const MKQ = (() => {
  const KEY = 'mkq-v1-';
  const PEER_PREFIX = 'mkq-maani-v1-';

  function load(key, fallback) {
    try {
      const v = localStorage.getItem(KEY + key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(KEY + key, JSON.stringify(val)); return true; } catch { return false; }
  }
  function sessionLoad(key, fallback) {
    try { const v = sessionStorage.getItem(KEY + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function sessionSave(key, val) {
    try { sessionStorage.setItem(KEY + key, JSON.stringify(val)); } catch {}
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function builtinSet() {
    const res = await fetch('data/maani-kalimah.json');
    const data = await res.json();
    return { id: 'builtin', name: data.name, items: data.items, builtin: true };
  }

  // Set asal (fail JSON) + set yang dibuat dalam editor (localStorage)
  async function allSets() {
    const sets = [];
    try { sets.push(await builtinSet()); } catch (e) { console.warn('Gagal muat set asal', e); }
    return sets.concat(load('sets', []));
  }

  // Format: "kalimah : maksud" satu baris satu entri
  function parseText(text) {
    const items = [], errors = [];
    String(text).split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      const idx = line.indexOf(':');
      const kalimah = idx > -1 ? line.slice(0, idx).trim() : '';
      const maani = idx > -1 ? line.slice(idx + 1).trim() : '';
      if (!kalimah || !maani) errors.push(i + 1);
      else items.push({ kalimah, maani });
    });
    return { items, errors };
  }

  function toText(items) {
    return items.map(i => `${i.kalimah} : ${i.maani}`).join('\n');
  }

  const LABELS = {
    k2m: 'Apakah maksud kalimah ini?',
    m2k: 'Kalimah manakah yang membawa maksud ini?'
  };

  // mode: 'k2m' | 'm2k' | 'campur'; count: nombor atau 'all'
  function buildQuestions(items, { mode, count }) {
    const n = count === 'all' ? items.length : Math.min(Number(count), items.length);
    return shuffle(items).slice(0, n).map(item => {
      const m = mode === 'campur' ? (Math.random() < 0.5 ? 'k2m' : 'm2k') : mode;
      const ask = m === 'k2m' ? 'kalimah' : 'maani';
      const ans = m === 'k2m' ? 'maani' : 'kalimah';
      const wrong = shuffle([...new Set(items.map(i => i[ans]).filter(v => v !== item[ans]))]).slice(0, 3);
      const choices = shuffle([item[ans], ...wrong]);
      return { mode: m, prompt: item[ask], choices, correct: choices.indexOf(item[ans]) };
    });
  }

  // 500–1000 mata ikut kelajuan + bonus streak (maks 500)
  function points(ms, limitMs, streak) {
    const base = Math.round(1000 * (1 - Math.min(ms / limitMs, 1) / 2));
    const bonus = streak >= 2 ? Math.min((streak - 1) * 100, 500) : 0;
    return base + bonus;
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }

  return { PEER_PREFIX, load, save, sessionLoad, sessionSave, uid, shuffle, allSets, parseText, toText, LABELS, buildQuestions, points, show };
})();
