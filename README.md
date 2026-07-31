# BLD Trainer

PWA do treningu algorytmów blindcubing (3BLD) na Rubika 3x3.

**Live:** https://bldtrainer.grzegorzpacewicz.pl

**Repo:** https://github.com/GrzegorzPacewicz/bldtrainer

## Funkcje

- Import algorytmów z Excel (.xlsx) lub TXT
- Trening z timerem i live podglądem czasu
- Inteligentne tryby treningowe (Słabe punkty, Utrzymanie, Nowe)
- Automatyczna kategoryzacja case'ów (Szybkie/Wolne/Niestabilne/Regres)
- Szczegółowe statystyki per bufor z trendami
- Edycja algorytmów w aplikacji
- Oznaczanie trudnych case'ów
- Działa offline (PWA)

---

## Import algorytmów

### Nazwa arkusza Excel

Nazwa arkusza określa typ elementów i bufor:

```
edges_UF       → krawędzie, bufor UF
edges_DF       → krawędzie, bufor DF
corners_UFR    → rogi, bufor UFR
corners_UBL    → rogi, bufor UBL
parity_UFR     → parity, bufor UFR
```

Format: `{edges|corners|parity}_{BUFOR}`

---

### Format Excel: Tabela NxN

Najwygodniejszy format dla pełnego zestawu algorytmów.

**Struktura:**
- Wiersz 1 (nagłówki): targety dla pierwszego elementu pary
- Kolumna A (od wiersza 2): targety dla drugiego elementu pary
- Komórki: algorytmy

**Przykład arkusza `edges_UF`:**

|        | A (UB)      | B (UR)      | C (UL)      | D (LU)      |
|--------|-------------|-------------|-------------|-------------|
| A (UB) | -           | R U R' U'   | L' U' L U   | M' U2 M     |
| B (UR) | R' U' R U   | -           | M2 U M2 U'  | L U L'      |
| C (UL) | L U L' U'   | M2 U' M2 U  | -           | U' L' U L   |
| D (LU) | M U2 M'     | L' U' L     | U L U' L'   | -           |

**Format nagłówków:**

```
A (UB)
↑   ↑
│   └── sticker (wewnętrzny identyfikator)
└────── letter pair (wyświetlany w grze)
```

- **Letter pair** = litera/y przed nawiasem (np. `A`, `AB`, `Ko`)
- **Sticker** = zawartość nawiasu (np. `UB`, `UR`, `UFR`)

Jeśli nie używasz letter pairs, możesz wpisać sam sticker:

|      | UB          | UR          | UL          |
|------|-------------|-------------|-------------|
| UB   | -           | R U R' U'   | L' U' L U   |
| UR   | R' U' R U   | -           | M2 U M2 U'  |
| UL   | L U L' U'   | M2 U' M2 U  | -           |

---

### Format Excel: Lista

Prostszy format — każdy wiersz to jeden case.

**Kolumny:** Target 1 | Target 2 | Algorytm

**Przykład arkusza `edges_UF`:**

| A          | B          | C               |
|------------|------------|-----------------|
| A (UB)     | B (UR)     | R U R' U'       |
| A (UB)     | C (UL)     | L' U' L U       |
| A (UB)     | D (LU)     | M' U2 M         |
| B (UR)     | A (UB)     | R' U' R U       |
| B (UR)     | C (UL)     | M2 U M2 U'      |

---

### Format Parity

Parity ma osobny format — jeden target zamiast dwóch.

**Kolumny:** LP (target) | Algorytm

**Przykład arkusza `parity_UFR`:**

| LP           | Algorytm                    |
|--------------|------------------------------|
| A (UBL)      | R U R' F R' F' R            |
| B (UBR)      | R U' R' U' R U R D R' U'... |
| C (UFR)      | ...                         |

Pierwszy wiersz to nagłówek (pomijany przy imporcie).

---

### Format TXT

Plik tekstowy z sekcjami.

```
# edges_UF
UB UR: R U R' U'
UB UL: L' U' L U
UB LU: M' U2 M
UR UB: R' U' R U
UR UL: M2 U M2 U'

# edges_DF
FD BD: M2 U2 M2
FD RD: R' U R U' M2

# corners_UFR
UBL URB: R U R' U'
UBL UFL: L' U' L U
```

**Format:**
- `# typ_bufor` — nagłówek sekcji
- `target1 target2: algorytm` — definicja case'a

---

### Oznaczanie trudnych case'ów

Dodaj emoji 💩 gdziekolwiek w algorytmie:

```
R U R' U' 💩
💩 L' U' L U
```

Case zostanie oznaczony jako "Trudny" i pojawi się w trybie **Słabe punkty**.

---

## Gra

1. Wybierz typ: **Krawędzie**, **Rogi** lub **Parity**
2. Wybierz bufor (jeśli masz kilka)
3. Wybierz tryb lub konkretne case'y
4. Kliknij **Start** (trening z timerem) lub **Nauka** (flashcards)
5. Po odliczaniu 3-2-1 wykonaj algorytm i dotknij ekran
6. Timer pokazuje czas w trakcie wykonania
7. Po sesji zapisz lub odrzuć wyniki

---

## Tryb Nauka (Flashcards)

Tryb do nauki nowych algorytmów bez presji czasu.

1. Wybierz case'y i kliknij **Nauka**
2. Widzisz case — przypomnij sobie algorytm
3. Dotknij ekran (lub spacja) aby zobaczyć algorytm
4. Oceń: **Znam** (✓) lub **Nie znam** (✗)
5. "Nie znam" automatycznie oznacza case jako trudny

**Skróty klawiszowe:**
- Spacja — odkryj algorytm / następny (jeśli znam)
- ← lub 1 — Nie znam
- → lub 2 — Znam

**Dodatkowe opcje:**
- ✎ — edytuj algorytm w trakcie nauki
- ← Wróć — wyjście z zachowaniem postępu

---

## Tryby treningowe

| Tryb | Opis |
|------|------|
| **Wszystkie** | Wszystkie case'y dla bufora |
| **Słabe punkty** | Wolne + niestabilne + regres + trudne |
| **Utrzymanie** | Szybkie + średnie (utrzymanie formy) |
| **Nowe** | Case'y z <5 wykonań |

### Kategorie szczegółowe

| Kategoria | Logika |
|-----------|--------|
| **Szybkie** | Średnia < 80% globalnej średniej bufora |
| **Wolne** | Średnia > 120% globalnej średniej bufora |
| **Niestabilne** | Odch. std. > 150% globalnego |
| **Regres** | Ostatnie 5 wyników gorsze od poprzednich 5 o >15% |
| **Nowe** | Mniej niż 5 wykonań |
| **Trudne** | Ręcznie oznaczone (💩 lub przycisk !) |

### Wybór niestandardowy

1. Wybierz target z list rozwijanych
2. Kliknij **+** aby dodać do selekcji
3. Kliknij **−** aby usunąć z selekcji
4. Checkbox **Z inwersją** dodaje automatycznie AB → BA

---

## Statystyki

Cztery zakładki: **Ogólne** / **Krawędzie** / **Rogi** / **Parity**

### Per bufor:
- Liczba case'ów (z wynikami / wszystkie)
- Łączna liczba wykonań
- Średni czas i odchylenie std.
- Rozkład kategorii (kolorowe badges)
- Trendy (↑ poprawa / → stabilne / ↓ regres)

### Tabela case'ów

Kliknij na wiersz case'a aby edytować algorytm lub zresetować wyniki.

| Kolumna | Opis |
|---------|------|
| Case | Letter pair (! = trudny) |
| Wyk. | Liczba wykonań |
| Avg | Średni czas |
| Std | Odchylenie standardowe |
| Best | Najlepszy czas |
| Worst | Najgorszy czas |
| Kat. | S=szybki, Ś=średni, W=wolny, N=niestabilny, ?=nowy, R=regres |
| Tr. | ↑=poprawa, →=stabilny, ↓=regres |

**Re-import:** Zachowuje istniejące wyniki treningów — można bezpiecznie aktualizować algorytmy.

---

## Wyniki sesji

Po zakończeniu sesji:

| Przycisk | Akcja |
|----------|-------|
| **✎** | Edytuj algorytm |
| **!** | Oznacz jako trudny |
| **×** | Usuń wynik z sesji |
| **Zapisz** | Zapisz wszystkie wyniki do bazy |
| **Odrzuć** | Nie zapisuj wyników |

---

## Nawigacja

- **BLD Trainer** (na górze każdego ekranu) → powrót do menu
- **?** (na ekranie głównym) → instrukcja w aplikacji

---

## Stack techniczny

- Vanilla JS/CSS/HTML (zero frameworków)
- IndexedDB (lokalny storage w przeglądarce)
- xlsx.js (parsowanie plików Excel)
- Service Worker (network-first, działa offline)
- PWA (instalowalna na telefonie)

## Uruchomienie lokalne

```bash
npx serve .
```

## Deploy

GitHub Pages + Cloudflare subdomain

---

## Changelog

### v1.1 (2026-07-31)

- Parity: nowy typ case'ów (jeden target)
- Reset wyników dla poszczególnych case'ów
- Re-import zachowuje istniejące wyniki
- Ulepszone UI: większe elementy dotykowe (~48px), custom strzałka w selectach
- Zaktualizowane instrukcje

### v1.0 (2026-07-31)

- Tryb Nauka (flashcards) z oceną Znam/Nie znam
- Checkbox "trudny" w modalu edycji algorytmu
- Pomijanie case'ów bez algorytmów (pusty alg = wyłączony case)
- Sortowalna tabela case'ów w statystykach
- Podgląd wybranych case'ów przed startem
- Polska terminologia w UI
- Edycja algorytmu w trakcie nauki
- Link do GitHub w stopce
