# BLD AlgDriller

PWA do treningu algorytmów blindcubing (3BLD).

## Stack
- Vanilla JS/CSS/HTML
- IndexedDB (lokalny storage algorytmów i wyników)
- localStorage (ustawienia, sortowanie, statystyki dzienne)
- xlsx.js (import/eksport exceli)
- Service Worker (network-first)

## Struktura
- `index.html` — główny plik + modal pomocy + modal edycji alg
- `css/style.css` — style
- `js/db.js` — IndexedDB wrapper
- `js/game.js` — logika gry (Game class) + timer + statystyki dzienne
- `js/import.js` — import Excel/TXT
- `js/stats.js` — statystyki + eksport Excel
- `js/app.js` — główna logika UI + pauza + obsługa historii (Android back)
- `sw.js` — Service Worker
- `manifest.json` — PWA manifest

## UI Flow
1. Menu główne → wybór typu (Krawędzie/Rogi/Parity)
2. Wybór bufora (jeśli >1)
3. Wybór trybu/podzbioru → Start/Nauka
4. Gra: tap startuje timer, tap zatrzymuje i zapisuje wynik
5. Wyniki sesji → Zapisz/Odrzuć

## Nawigacja
- Logo "BLD AlgDriller" na górze → powrót do menu
- ⏸ (w grze) → menu pauzy: Kontynuuj / Zakończ z zapisem / Anuluj
- Android back → otwiera pauzę w grze / cofa na poprzedni ekran
- `.btn-back` ukryte na mobile (≤600px) — Android ma systemowy back

## Tryby gry
- **Słabe punkty** — wolne + niestabilne + regres + trudne
- **Utrzymanie** — szybkie + średnie
- **Nowe** — <5 wykonań
- Kategorie szczegółowe: Szybkie, Średnie, Wolne, Niestabilne, Regres, Trudne
- Custom: wybór po target1/target2, opcjonalnie z inwersją

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
