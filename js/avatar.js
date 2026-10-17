// Avatar player: semua bahagian dilukis dari kepingan SVG tetap.
// Avatar dihantar sebagai nombor indeks sahaja, dan sanitize() memastikan
// setiap nilai dalam julat, jadi tiada teks pemain masuk ke dalam SVG.
const AVATAR = (() => {
  const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac', '#c0a080'];
  const parts = {
    color: colors.map((_, i) => `Warna ${i + 1}`),
    eyes: ['Bulat', 'Senyum', 'Kenyit', 'Bersinar'],
    mouth: ['Senyum', 'Gelak', 'Terkejut', 'Lidah'],
    hat: ['Tiada', 'Songkok', 'Kopiah', 'Tudung', 'Topi', 'Mahkota'],
    extra: ['Tiada', 'Cermin mata', 'Cermin hitam', 'Pipi merah']
  };
  const LABELS = { color: 'Warna', eyes: 'Mata', mouth: 'Mulut', hat: 'Kepala', extra: 'Aksesori' };
  const KEYS = Object.keys(parts);

  function sanitize(a) {
    const out = {};
    KEYS.forEach(k => {
      const v = Number(a && a[k]);
      out[k] = Number.isInteger(v) && v >= 0 && v < parts[k].length ? v : 0;
    });
    return out;
  }

  function random() {
    const out = {};
    KEYS.forEach(k => { out[k] = Math.floor(Math.random() * parts[k].length); });
    return out;
  }

  const EYES = [
    '<circle cx="46" cy="60" r="9" fill="#fff"/><circle cx="74" cy="60" r="9" fill="#fff"/><circle cx="47" cy="61" r="4.5" fill="#222"/><circle cx="75" cy="61" r="4.5" fill="#222"/>',
    '<path d="M38 62 Q46 52 54 62" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 62 Q74 52 82 62" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>',
    '<circle cx="46" cy="60" r="9" fill="#fff"/><circle cx="47" cy="61" r="4.5" fill="#222"/><path d="M66 61 Q74 55 82 61" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>',
    '<circle cx="46" cy="60" r="10" fill="#222"/><circle cx="74" cy="60" r="10" fill="#222"/><circle cx="49" cy="56" r="3.5" fill="#fff"/><circle cx="77" cy="56" r="3.5" fill="#fff"/><circle cx="43" cy="63" r="1.8" fill="#fff"/><circle cx="71" cy="63" r="1.8" fill="#fff"/>'
  ];
  const MOUTHS = [
    '<path d="M48 79 Q60 90 72 79" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/>',
    '<path d="M45 77 Q60 99 75 77 Z" fill="#5c1a1a"/><path d="M52 88 Q60 93 68 88" stroke="#ff8fa3" stroke-width="4" fill="none"/>',
    '<ellipse cx="60" cy="84" rx="7" ry="9" fill="#5c1a1a"/>',
    '<path d="M48 79 Q60 89 72 79" stroke="#222" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M56 84 Q60 96 64 84 Z" fill="#ff6b8a"/>'
  ];
  const HATS = [
    '',
    '<path d="M37 33 L83 33 L80 13 L40 13 Z" fill="#1f1f1f"/><rect x="37" y="29" width="46" height="4" fill="#3a3a3a"/>',
    '<path d="M34 34 Q60 4 86 34 Z" fill="#fafafa" stroke="#d0d0d0" stroke-width="2"/><path d="M42 28 L78 28" stroke="#c9c9c9" stroke-width="2" stroke-dasharray="3 3"/>',
    '', // tudung dilukis berasingan (perlu di belakang muka)
    '<path d="M28 38 Q60 0 92 38 Z" fill="#e8590c"/><path d="M60 36 L104 40 L100 46 L60 42 Z" fill="#c2410c"/><circle cx="60" cy="12" r="4" fill="#c2410c"/>',
    '<path d="M36 34 L36 12 L48 24 L60 6 L72 24 L84 12 L84 34 Z" fill="#fcc419" stroke="#e67700" stroke-width="2"/><circle cx="60" cy="22" r="3.5" fill="#e03131"/>'
  ];
  const EXTRAS = [
    '',
    '<circle cx="46" cy="60" r="12" fill="none" stroke="#222" stroke-width="3"/><circle cx="74" cy="60" r="12" fill="none" stroke="#222" stroke-width="3"/><path d="M58 60 L62 60" stroke="#222" stroke-width="3"/>',
    '<rect x="32" y="52" width="26" height="16" rx="6" fill="#111"/><rect x="62" y="52" width="26" height="16" rx="6" fill="#111"/><path d="M58 58 L62 58" stroke="#111" stroke-width="3"/><path d="M36 56 L44 56" stroke="#555" stroke-width="2"/>',
    '<ellipse cx="36" cy="75" rx="7" ry="4.5" fill="#ff8fab" opacity=".75"/><ellipse cx="84" cy="75" rx="7" ry="4.5" fill="#ff8fab" opacity=".75"/>'
  ];

  function svg(a) {
    a = sanitize(a);
    const c = colors[a.color];
    let body;
    if (a.hat === 3) {
      // Tudung: kain di belakang, muka bujur di hadapan
      body = '<path d="M60 14 C24 14 16 48 18 74 C20 98 36 108 60 108 C84 108 100 98 102 74 C104 48 96 14 60 14 Z" fill="#5f3dc4"/>' +
        `<ellipse cx="60" cy="68" rx="30" ry="32" fill="${c}"/>`;
    } else {
      body = `<circle cx="60" cy="66" r="40" fill="${c}"/><ellipse cx="60" cy="102" rx="26" ry="6" fill="rgba(0,0,0,.12)"/>`;
    }
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}${EYES[a.eyes]}${MOUTHS[a.mouth]}${EXTRAS[a.extra]}${HATS[a.hat]}</svg>`;
  }

  return { parts, LABELS, KEYS, colors, sanitize, random, svg };
})();
