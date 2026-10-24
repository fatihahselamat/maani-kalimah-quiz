// Editor set soalan: set custom disimpan dalam localStorage ('sets').
(function () {
  const $ = id => document.getElementById(id);
  let editingId = null;

  async function renderList() {
    const sets = await MKQ.allSets();
    const box = $('sets');
    box.textContent = '';
    sets.forEach(s => {
      const row = document.createElement('div'); row.className = 'set-item';
      const info = document.createElement('div'); info.className = 'info';
      const b = document.createElement('b'); b.textContent = s.name;
      if (s.builtin) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'ASAL'; b.append(t); }
      const n = document.createElement('span'); n.textContent = `${s.items.length} ${s.unit || 'kalimah'}`;
      info.append(b, n);
      row.append(info);
      if (s.builtin) {
        row.append(button('Salin & edit', 'ghost', () => openEditor(null, s.name + ' (salinan)', s.items)));
      } else {
        row.append(button('Edit', 'ghost', () => openEditor(s.id, s.name, s.items)));
        row.append(button('Padam', 'danger', () => {
          if (!confirm(`Padam set "${s.name}"? Tindakan ini tak boleh dibatalkan.`)) return;
          MKQ.save('sets', MKQ.load('sets', []).filter(x => x.id !== s.id));
          renderList();
        }));
      }
      box.append(row);
    });
  }

  function button(text, kind, fn) {
    const b = document.createElement('button');
    b.className = 'btn small ' + kind;
    b.textContent = text;
    b.onclick = fn;
    return b;
  }

  function openEditor(id, name, items) {
    editingId = id;
    $('edit-title').textContent = id ? 'Edit Set' : 'Set Baharu';
    $('set-name').value = name || '';
    $('set-text').value = items ? MKQ.toText(items) : '';
    $('edit-msg').textContent = '';
    updateCount();
    MKQ.show('s-edit');
  }

  function updateCount() {
    const { items, errors } = MKQ.parseText($('set-text').value);
    $('edit-count').textContent = `${items.length} kalimah` + (errors.length ? ` · ${errors.length} baris tak sah` : '');
  }
  $('set-text').addEventListener('input', updateCount);

  $('btn-new').onclick = () => openEditor(null, '', null);
  $('btn-cancel').onclick = () => MKQ.show('s-list');

  $('btn-save').onclick = () => {
    const name = $('set-name').value.trim();
    const { items, errors } = MKQ.parseText($('set-text').value);
    if (!name) return ($('edit-msg').textContent = 'Sila beri nama set.');
    if (errors.length) return ($('edit-msg').textContent = `Baris ${errors.slice(0, 5).join(', ')} tiada tanda ":" atau kosong di satu belah.`);
    if (items.length < 4) return ($('edit-msg').textContent = 'Perlu sekurang-kurangnya 4 kalimah (untuk 4 pilihan jawapan).');
    const sets = MKQ.load('sets', []);
    if (editingId) {
      const s = sets.find(x => x.id === editingId);
      if (s) { s.name = name; s.items = items; }
    } else {
      sets.push({ id: MKQ.uid(), name, items });
    }
    if (!MKQ.save('sets', sets)) return ($('edit-msg').textContent = 'Gagal simpan (storan browser penuh atau disekat).');
    renderList();
    MKQ.show('s-list');
  };

  renderList();
})();
