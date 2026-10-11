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
- **Słabe** — wolne + niestabilne + regres + trudne
- **Utrzymanie** — szybkie + średnie
- **Nowe** — <5 wykonań
- Kategorie w dwóch niezależnych osiach (`categorizeCase` w stats.js):
  - tempo (`speed`): Szybkie / Średnie / Wolne — wymaga ao5/ao12, względem tempa bufora (80% / 120%)
  - stan (`states`, może być kilka): Nowe, Rzadkie (brak ao12 lub >14 dni od ostatniego wykonania — pole `lastTrainedAt`, ustawiane w `appendResult`), Niestabilne, Regres (>20%), Trudne (ręczne)
- Custom: wybór po target1/target2, opcjonalnie z inwersją

## Uruchomienie lokalne
```bash
npx serve .
```

## Deploy
GitHub Pages + Cloudflare subdomain: `driller.grzegorzpacewicz.pl` (CNAME)

## Wydanie nowej wersji
- Wersja i data w `index.html` (`<div class="version">`, np. `v2.13 | 2026-10-11`)
- Wpis w Changelog w `README.md`
- Po zmianie pliku JS/CSS podbij jego `?v=N` w `index.html` i w `ASSETS` w `sw.js` (oraz `CACHE_NAME`)
- README opisuje funkcje dla użytkownika — aktualizuj przy nowych funkcjach, razem z modalem pomocy w `index.html`

## Format importu Excel
Arkusz nazywany `{pieceType}_{buffer}` np. `edges_UF`, `corners_UFR`, `parity_UFR`:
- **Krawędzie/Rogi tabela NxN**: header = first target, first column = second target
- **Krawędzie/Rogi lista**: kolumna A = target1, B = target2, C = alg
- **Parity**: pierwszy wiersz to nagłówek (pomijany), kolumna A = LP + target (np. "A (UBL)"), B = alg

Re-import zachowuje istniejące wyniki treningów.

## Memo (wyrazy do letter pairów)
- Osobny store `memo` w IndexedDB (`{key, word}`), wspólny dla wszystkich typów i buforów; w pamięci `memoMap` (db.js)
- Klucz = LP (np. `AB`); parity = LP + `Z` (np. `AZ`)
- Import/eksport: arkusz `memo`, tabela NxN (nagłówek = pierwsza litera, pierwsza kolumna = druga litera)
- Tryb wyświetlania w grze/nauce (`localStorage.caseDisplay`): `both` (memo duże, LP pod spodem) / `memo` / `lp` — przełącznik na ekranie wyboru trybu
- Wyniki sesji i statystyki pokazują tylko LP

## Format importu TXT
```
# edges_UF
AB CD: R U R' U'
EF GH: [R U R', D]
```
