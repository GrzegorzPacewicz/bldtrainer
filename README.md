# BLD Trainer

PWA do treningu algorytmów blindcubing (3BLD) na Rubika 3x3.

**Live:** https://bldtrainer.grzegorzpacewicz.pl

## Funkcje

- Import algorytmów z Excel (.xlsx) lub TXT
- Trening z timerem (countdown 3-2-1, automatyczny start)
- Wybór podzbioru: All, Slow, Unstable, Difficult
- Filtrowanie po letter pairs
- Statystyki sesji i globalne
- Działa offline (PWA)

## Format importu Excel

Nazwa arkusza: `{pieceType}_{buffer}` np. `edges_UF`, `corners_UFR`

Nagłówki w formacie: `A (UL)` gdzie:
- `A` = letter pair (wyświetlane w grze)
- `(UL)` = sticker/target (wewnętrzny)

Tabela NxN z algorytmami w komórkach.

## Stack

- Vanilla JS/CSS/HTML
- IndexedDB (lokalny storage)
- xlsx.js (import exceli)
- Service Worker (network-first)

## Uruchomienie lokalne

```bash
npx serve .
```

## Deploy

GitHub Pages + Cloudflare subdomain
