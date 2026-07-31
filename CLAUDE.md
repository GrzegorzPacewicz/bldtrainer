# BLD Trainer

PWA do treningu algorytmów blindcubing (3BLD).

## Stack
- Vanilla JS/CSS/HTML
- IndexedDB (lokalny storage)
- xlsx.js (import exceli)
- Service Worker (network-first)

## Struktura
- `index.html` — główny plik
- `css/style.css` — style
- `js/db.js` — IndexedDB wrapper
- `js/game.js` — logika gry (Game class)
- `js/import.js` — import Excel/TXT
- `js/stats.js` — statystyki
- `js/app.js` — główna logika UI
- `sw.js` — Service Worker
- `manifest.json` — PWA manifest

## Uruchomienie lokalne
```bash
npx serve .
```

## Deploy
GitHub Pages + Cloudflare subdomain: `bldtrainer.grzegorzpacewicz.pl`

## Format importu Excel
Arkusz nazywany `{pieceType}_{buffer}` np. `edges_UF`, `corners_UFR`, `parity_UFR`:
- **Krawędzie/Rogi tabela NxN**: header = first target, first column = second target
- **Krawędzie/Rogi lista**: kolumna A = target1, B = target2, C = alg
- **Parity**: pierwszy wiersz to nagłówek (pomijany), kolumna A = LP + target (np. "A (UBL)"), B = alg

Re-import zachowuje istniejące wyniki treningów.

## Format importu TXT
```
# edges_UF
AB CD: R U R' U'
EF GH: [R U R', D]
```
