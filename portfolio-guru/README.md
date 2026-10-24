# Portfolio Guru

A single-page app (`index.html`) for recording a teacher's annual portfolio: profile, Pengurusan, Kokurikulum, Kursus, Keterlibatan Dengan Organisasi, Program Kelab Guru ILMI and Program Sekolah. Each entry can hold up to 4 photos.

## Data storage

- All data (including photos) is stored **in the browser itself** (IndexedDB). Nothing is sent to any server or to GitHub.
- Data only exists in the browser where you entered it. A different device or browser will show an empty portfolio.
- **Click "Muat turun sandaran" regularly** to save a `.json` file. Use "Pulih sandaran" to bring the data back, for example on a new laptop.
- Clearing browser data (cache/site data) will erase your portfolio, so keep the backup file.

## Printing / PDF

Click **Cetak / Simpan PDF**, then in the print dialog choose **Save as PDF** as the destination. Turn off "Headers and footers" for a tidier result.

## Hosting on GitHub Pages

1. Create a new repo on GitHub, e.g. `portfolio-guru`.
2. Upload `index.html` (and this README) to the root of the repo.
3. Go to **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick `main` and `/ (root)`, then Save.
4. After a few minutes the site is live at `https://<username>.github.io/portfolio-guru/`.

> ⚠️ **Never upload the backup `.json` file to the repo.** A GitHub Pages repo is usually public, and that file contains your staff ID, name and photos.
