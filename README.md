# Kuiz Maani Kalimah

Game kuiz live ala Kahoot untuk menghafal maani kalimah dan syarah ayat (Juz 'Amma). Ramai pemain boleh main serentak menggunakan phone masing-masing. Tiada database dan tiada server sendiri.

## Cara main

1. **Host** (laptop + projector): buka laman → **Host Game** → pilih set soalan → **Buka Lobby**.
2. **Pemain**: imbas QR atau buka `play.html` → masukkan PIN → isi nama → bina avatar → **Masuk Game**.
3. Host tekan **Mula**. Jawapan yang betul dan cepat dapat lebih banyak mata (500–1000), dan ada bonus streak.

## Bagaimana ia berfungsi

- **Peer-to-peer (WebRTC melalui [PeerJS](https://peerjs.com))**: browser host bertindak sebagai "server". Phone pemain bersambung terus ke browser host.
- Server awam PeerJS cuma digunakan untuk memperkenalkan peranti semasa join. Tiada data game disimpan di sana.
- **localStorage** (di peranti host): set soalan custom, tetapan terakhir, sejarah 20 game terkini.
- Jawapan betul hanya wujud dalam browser host, jadi pemain tak boleh meniru jawapan melalui DevTools.

## Had

- Tab host mesti kekal terbuka sepanjang game. Kalau di-refresh, game tamat.
- Sesuai untuk sekitar 30–40 pemain.
- Sesetengah WiFi sekolah atau pejabat menyekat WebRTC. Kalau tak boleh join, guna hotspot phone.
- Set soalan custom disimpan dalam browser yang membuatnya sahaja. Buat set di peranti yang akan jadi host.

## Struktur

```
index.html      laman utama + sejarah game
host.html       lobby, soalan, papan markah, podium
play.html       join, avatar builder, butang jawapan
editor.html     tambah / edit set soalan (format "kalimah : maksud")
js/common.js    storan, jana soalan, kiraan mata
js/avatar.js    avatar SVG
js/host.js      logik game + PeerJS (host)
js/player.js    logik pemain + PeerJS
data/maani-kalimah.json   set tetap: 36 maani kalimah
data/syarah-ayat.json     set tetap: 29 syarah ayat (dengan nama surah)
                          + set "Campur Semua" dijana automatik dari semua set tetap
                            (jawapan salah sentiasa dari set yang sama dengan soalan)
```

## Jalankan di komputer sendiri

Perlu dibuka melalui server, bukan dengan klik dua kali fail (sebab `fetch` dan WebRTC). Contoh:

```bash
ruby -run -e httpd . -p 8000
```

Kemudian buka http://localhost:8000. Untuk uji dengan phone sebenar, deploy ke GitHub Pages (perlu HTTPS).

## Deploy ke GitHub Pages

1. Push repo ini ke GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Laman akan live di `https://USERNAME.github.io/NAMA-REPO/`.

## Tambah set soalan tetap

Set tetap muncul di semua peranti (berbeza dengan set dari editor, yang hanya disimpan dalam satu browser).

1. Buat fail baharu dalam `data/`, contohnya `data/surah-al-mulk.json`, ikut format `data/syarah-ayat.json`:
   - `kalimah`: soalan (kalimah atau ayat)
   - `maani`: jawapan (maksud atau syarah)
   - `surah`, `labels`, `unit`: pilihan
2. Tambah nama fail itu dalam `BUILTIN_FILES` dalam `js/common.js`.
