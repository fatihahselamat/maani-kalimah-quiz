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

  // Set tetap: tambah fail JSON baharu dalam folder data/ dan senaraikan di sini
  const BUILTIN_FILES = ['data/maani-kalimah.json', 'data/syarah-ayat.json'];

  async function builtinSets() {
    const sets = await Promise.all(BUILTIN_FILES.map(async file => {
      try {
        const data = await (await fetch(file)).json();
        return { id: data.id || file, name: data.name, unit: data.unit, labels: data.labels, items: data.items, builtin: true };
      } catch (e) {
        console.warn('Gagal muat', file, e);
        return null;
      }
    }));
    return sets.filter(Boolean);
  }

  // Set gabungan semua set tetap. Setiap item ingat set asalnya (group) dan
  // labelnya, supaya jawapan salah diambil dari jenis yang sama sahaja
  // (soalan maani tak dapat pilihan syarah, dan sebaliknya).
  function combinedSet(sets) {
    if (sets.length < 2) return null;
    return {
      id: 'campur-semua',
      name: 'Campur Semua: ' + sets.map(s => s.name.replace(/ Juz 'Amma$/, '')).join(' + '),
      unit: 'soalan',
      builtin: true,
      items: sets.flatMap(s => s.items.map(i => Object.assign({}, i, { group: s.id, labels: s.labels })))
    };
  }

  // Set tetap (fail JSON) + set yang dibuat dalam editor (localStorage)
  async function allSets() {
    const builtin = await builtinSets();
    const combined = combinedSet(builtin);
    return builtin.concat(combined ? [combined] : [], load('sets', []));
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
  // labels: label soalan khas untuk set (pilihan), contohnya untuk syarah ayat
  function buildQuestions(items, { mode, count, labels }) {
    labels = Object.assign({}, LABELS, labels);
    const n = count === 'all' ? items.length : Math.min(Number(count), items.length);
    return shuffle(items).slice(0, n).map(item => {
      const m = mode === 'campur' ? (Math.random() < 0.5 ? 'k2m' : 'm2k') : mode;
      const ask = m === 'k2m' ? 'kalimah' : 'maani';
      const ans = m === 'k2m' ? 'maani' : 'kalimah';
      // Buang item yang soalan atau jawapannya sama, supaya tiada dua pilihan yang betul
      // (contohnya beberapa kalimah berkongsi maksud yang sama)
      // Dalam set gabungan, jawapan salah hanya dari set asal yang sama
      const pool = item.group ? items.filter(i => i.group === item.group) : items;
      const wrong = shuffle([...new Set(pool
        .filter(i => i[ask] !== item[ask] && i[ans] !== item[ans])
        .map(i => i[ans]))]).slice(0, 3);
      const choices = shuffle([item[ans], ...wrong]);
      return {
        mode: m, label: (item.labels && item.labels[m]) || labels[m], prompt: item[ask], choices, correct: choices.indexOf(item[ans]),
        // Nama surah hanya ditunjuk bila soalan ialah ayat (kalau tidak, ia jadi petunjuk jawapan)
        surah: m === 'k2m' ? (item.surah || '') : ''
      };
    });
  }

  // 500–1000 mata ikut kelajuan + bonus streak (maks 500)
  function points(ms, limitMs, streak) {
    const base = Math.round(1000 * (1 - Math.min(ms / limitMs, 1) / 2));
    const bonus = streak >= 2 ? Math.min((streak - 1) * 100, 500) : 0;
    return base + bonus;
  }

  // Kecilkan tulisan untuk teks panjang (syarah, ayat panjang)
  function sizeText(el, text, longAt, xlongAt) {
    const n = String(text).length;
    el.classList.toggle('long', n > longAt && n <= xlongAt);
    el.classList.toggle('xlong', n > xlongAt);
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }

  return { PEER_PREFIX, load, save, sessionLoad, sessionSave, uid, shuffle, allSets, parseText, toText, LABELS, buildQuestions, points, sizeText, show };
})();
