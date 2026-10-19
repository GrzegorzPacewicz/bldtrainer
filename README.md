# BLD Trainer

PWA do treningu algorytmów blindcubing (3BLD) na Rubika 3x3.

**Live:** https://driller.grzegorzpacewicz.pl

**Repo:** https://github.com/GrzegorzPacewicz/bldtrainer

## Funkcje

- Import algorytmów z Excel (.xlsx) lub TXT
- Eksport algorytmów ze statystykami do Excel
- Trening z timerem i live podglądem czasu
- Konfigurowalna pauza między algorytmami (0-4s)
- Inteligentne tryby treningowe (Słabe, Utrzymanie, Nowe)
- Automatyczna kategoryzacja przypadków w dwóch osiach: tempo (Szybkie/Średnie/Wolne) i stan (Nowe/Rzadkie/Niestabilne/Regres/Trudne)
- Szczegółowe statystyki per bufor z trendami
- Statystyki dzienne (ostatnie 7 dni)
- Edycja algorytmów w aplikacji (także pustych)
- Oznaczanie trudnych przypadków
- Memo — wyrazy do letter pairów wyświetlane w trakcie gry (import/eksport/edycja), opcjonalnie czytane na głos
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

Prostszy format — każdy wiersz to jeden przypadek.

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
- `target1 target2: algorytm` — definicja przypadku

---

### Oznaczanie trudnych przypadków

Dodaj emoji 💩 gdziekolwiek w algorytmie:

```
R U R' U' 💩
💩 L' U' L U
```

Przyp. zostanie oznaczony jako "Trudny" i pojawi się w trybie **Słabe**.

---

### Memo (wyrazy)

Arkusz o nazwie `memo` (w tym samym pliku co algi lub osobnym) — tabela NxN jak algi:

- Wiersz 1 (nagłówki): pierwsza litera pary
- Kolumna A (od wiersza 2): druga litera pary
- Komórki: wyrazy (`-` i puste pomijane)

|   | A    | B     | C      |
|---|------|-------|--------|
| A | -    | Baran | Cacko  |
| B | Abba | -     | Cebula |
| Z | Azor | Bzik  | Czapla |

Kolumna A, wiersz B = para **AB**. Słownik jest wspólny dla krawędzi, rogów i wszystkich buforów.
**Parity:** litera + `Z` (A → `AZ`), czyli wiersz `Z`.

Re-import nadpisuje wyrazy z pliku, pozostałe zostają. Arkusz `memo` jest dołączany do obu eksportów.

---

## Gra

1. Wybierz typ: **Krawędzie**, **Rogi** lub **Parity**
2. Wybierz bufor (jeśli masz kilka)
3. Wybierz tryb lub konkretne przypadek
4. Wybierz wyświetlanie: **Memo + LP** (wyraz, pod nim para) / **Memo** / **LP** / **Audio** (nic na ekranie, wyraz czytany na głos — trening z zamkniętymi oczami; pary bez wyrazu są pomijane) — gdy para nie ma wyrazu, zawsze widać LP
   - **Czytaj memo** (Wył/Wł) + tempo mowy — wyraz czytany na głos, czas startuje dopiero po przeczytaniu; pary bez wyrazu nie są czytane
5. Kliknij **Start** (trening z timerem) lub **Nauka** (flashcards)
6. Po odliczaniu 3-2-1 wykonaj algorytm i dotknij ekran
7. Timer pokazuje czas w trakcie wykonania
8. Po sesji zapisz lub odrzuć wyniki

---

## Tryb Nauka (Flashcards)

Tryb do nauki nowych algorytmów bez presji czasu.

1. Wybierz przypadek i kliknij **Nauka**
2. Widzisz przypadek — przypomnij sobie algorytm
3. Dotknij ekran (lub spacja) aby zobaczyć algorytm
4. Oceń: **Łatwe** lub **Trudne**
5. "Trudne" dodaje przypadkowi badge "Trudne" — pojawi się w trybie Słabe

Nazwy przycisków odpowiadają badge'om: kliknięcie "Trudne" = oznaczenie przypadku jako trudnego do dalszej pracy.

**Skróty klawiszowe:**
- Spacja — odkryj algorytm / następny (jeśli łatwe)
- ← lub 1 — Trudne
- → lub 2 — Łatwe

**Dodatkowe opcje:**
- ✎ — edytuj algorytm w trakcie nauki
- ← Wróć — wyjście z zachowaniem postępu

---

## Tryby treningowe

| Tryb | Opis |
|------|------|
| **Wszystkie** | Wszystkie przypadki dla bufora |
| **Słabe** | Wolne + niestabilne + regres + trudne |
| **Utrzymanie** | Szybkie + średnie (utrzymanie formy) |
| **Nowe** | Przypadki z <5 wykonań |
| **Szybkie / Średnie / Wolne / Niestab. / Regres / Trudne / Rzadkie** | Pojedyncze kategorie |

Puste kategorie są ukryte na ekranie wyboru trybu.

### Kategorie

Każdy przypadek ma dwie niezależne kategorie: **tempo** i **stan**. Mogą się łączyć — przypadek może być np. jednocześnie Wolny i Niestabilny.

Punktem odniesienia jest **"Aktualne tempo"** bufora — średnia ao12/ao5 wszystkich przypadków:

- ao12 używane gdy przypadek ma ≥12 wykonań
- ao5 używane gdy przypadek ma 5-11 wykonań

**Tempo** (wymaga ao5 lub ao12):

| Kategoria | Logika |
|-----------|--------|
| **Szybkie** | ao ≤ 80% aktualnego tempa |
| **Średnie** | ao między 80% a 120% tempa |
| **Wolne** | ao ≥ 120% aktualnego tempa |

**Stan** (może być kilka naraz):

| Kategoria | Logika |
|-----------|--------|
| **Nowe** | Mniej niż 5 wykonań (wtedy bez tempa i innych stanów) |
| **Rzadkie** | Mniej niż 12 wykonań (brak ao12) lub ponad 14 dni od ostatniego wykonania |
| **Niestabilne** | Odch. std. ostatnich 12 > 150% średniego dla bufora |
| **Regres** | Średnia ostatnich 5 wyników gorsza od poprzednich 5 o >20% (wymaga ≥10 wykonań) |
| **Trudne** | Ręcznie oznaczone (💩, przycisk ! lub „Trudne” w Nauce) |

### Wybór niestandardowy

1. Wybierz target z list rozwijanych
2. Kliknij **+** aby dodać do selekcji
3. Kliknij **−** aby usunąć z selekcji
4. **Reset** — wyczyść całą selekcję
5. Checkbox **Z inwersją** — po każdym przypadku (np. KJ) od razu pojawia się jego inwersja (JK)

---

## Statystyki

Cztery zakładki: **Ogólne** / **Krawędzie** / **Rogi** / **Parity**

### Per bufor:
- Liczba przypadków (z wynikami / wszystkie)
- Łączna liczba wykonań
- Średni czas i odchylenie std.
- **Aktualne tempo** — średnia ao12/ao5 wszystkich przypadków (punkt odniesienia dla kategorii)
- Rozkład kategorii (kolorowe badges)
- Trendy (↑ poprawa / → stabilne / ↓ regres)

### Tabela przypadków

Kliknij na wiersz przypadku aby edytować algorytm lub zresetować wyniki.

### Brak algorytmu

Pod tabelą wyświetlana jest sekcja z przypadkami bez algorytmu. Kliknij na przypadek aby dodać algorytm.

| Kolumna | Opis |
|---------|------|
| Przyp. | Letter pair (! = trudny) |
| Wyk. | Liczba wykonań |
| Avg | Średni czas |
| Std | Odchylenie standardowe (ostatnie 12) |
| ao5 | Średnia z ostatnich 5 (bez best/worst) |
| ao12 | Średnia z ostatnich 12 (bez best/worst) |
| Kat. | Tempo: S=szybki, Ś=średni, W=wolny; stan: ?=nowy, Rz=rzadki, N=niestabilny, R=regres (można łączyć, np. WN) |
| Tr. | ↑=poprawa, →=stabilny, ↓=regres |

**Re-import:** Zachowuje istniejące wyniki treningów — można bezpiecznie aktualizować algorytmy.

---

## Wyniki sesji

Po zakończeniu sesji:

| Przycisk | Akcja |
|----------|-------|
| **✎** | Edytuj algorytm i memo pary |
| **!** | Oznacz jako trudny |
| **×** | Usuń wynik z sesji |
| **Zapisz** | Zapisz wszystkie wyniki do bazy |
| **Odrzuć** | Nie zapisuj wyników |

---

## Nawigacja

- **BLD AlgDriller** (na górze każdego ekranu) → powrót do menu
- **⏸** (w trakcie gry) → pauza z opcjami:
  - **Kontynuuj** — wznawia grę (timer kontynuuje od miejsca pauzy)
  - **Zakończ z zapisem** — kończy grę i zapisuje dotychczasowe wyniki
  - **Anuluj grę** — wychodzi bez zapisywania
- **Systemowy back** (Android) → otwiera pauzę w grze / cofa na poprzedni ekran
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

### v2.14 (2026-10-19)

- Czytanie memo na głos (polski głos systemu), czas startuje po przeczytaniu
- Tryb wyświetlania Audio — trening z zamkniętymi oczami (pary bez memo pomijane)
- Wybór tempa mowy
- Trudne algorytmy oznaczane 💩 w eksporcie NxN
- Import rozpoznaje 💩 także w plikach zapisanych przez openpyxl/inne narzędzia

### v2.13 (2026-10-11)

- Memo: wyrazy do letter pairów (wspólny słownik, parity = litera + Z)
- Import/eksport memo jako arkusz `memo` (tabela NxN)
- Przełącznik wyświetlania w grze i nauce: Memo + LP / Memo / LP
- Edycja memo w oknie edycji algorytmu
- Pasek statusu na telefonie w kolorze motywu
- Przełącznik motywu znów pokazuje ikony SVG zamiast emoji
- Kategoria Rzadkie liczona od ostatniego wykonania (wcześniej od ostatniej zmiany — edycja i re-import ją resetowały)
- Pełny eksport zawiera kolumnę `LastTrained` (data ostatniego wykonania), odczytywaną przy imporcie

### v2.12 (2026-09-13)

- Kategorie w dwóch niezależnych osiach: **tempo** (szybkie / średnie / wolne, wymaga ao5/ao12) i **stan** (nowe / rzadkie / niestabilne / regres / trudne) — przypadek może być np. jednocześnie wolny i niestabilny
- Próg regresu podniesiony z 15% do 20%
- Pełne opisy kategorii w pomocy

### v2.11 (2026-09-12)

- Nowa kategoria **Rzadkie**: brak ao12 lub ostatni trening ponad 14 dni temu
- Puste kategorie są ukrywane na ekranie wyboru trybu
- „Słabe punkty” przemianowane na „Słabe”

### v2.10 (2026-09-11)

- Poprawka: trudne przypadki były czyszczone po sesji, w której nie kliknięto żadnego „!”

### v2.09 (2026-09-10)

- Poprawka: odznaczenie trudnego przypadku nie zapisywało się w bazie
- Odchylenie std liczone z ostatnich 12 wyników zamiast z całej historii

### v2.08 (2026-09-10)

- Kolumny ao5/ao12 w tabeli statystyk zamiast Best/Worst
- Nowa metryka "Aktualne tempo" — średnia ao12/ao5 bufora jako punkt odniesienia dla kategoryzacji
- Eksport Excel zawiera ao5/ao12 zamiast Best/Worst

### v2.07 (2026-09-08)

- Kategoryzacja przypadków używa ao12 (≥12 wyników) lub ao5 (5-11 wyników) względem tempa bufora zamiast średnich globalnych

### v2.06 (2026-08-14 – 2026-08-25)

- Nowa subdomena: driller.grzegorzpacewicz.pl
- Poprawki nawigacji: Android back button działa poprawnie po zakończeniu gry i w trybie nauki
- Wyjście z trybu nauki wraca do wyboru trybu (nie do menu głównego)
- Przyciski w flashcards przemianowane na Łatwe/Trudne (zamiast Znam/Nie znam), sekcja o trybie Nauka w pomocy
- Ekran wyników: większe elementy dotykowe, poprawna liczba przypadków z inwersją, wyśrodkowana nazwa przypadku
- Poprawki kontrastu WCAG AA dla przycisków wyników (także hover)
- Nowy styl oznaczenia trudnego przypadku
- Okno edycji zachowuje stan „trudny” z ekranu wyników
- Poprawki algorytmów inwersji

### v2.05 (2026-08-12)

- Poprawka: przycisk back wymagał podwójnego naciśnięcia po zakończeniu gry

### v2.04 (2026-08-11)

- Ujednolicone kategorie w statystykach — 9 kategorii w siatce 3x3, tak jak w grze
- Filtry "Słabe punkty" i "Utrzymanie" dodane do widoku statystyk
- Liczniki kategorii w statystykach zgodne z wyborem w grze
- Ujednolicony styl przycisków kategorii

### v2.03 (2026-08-10)

- Eksport w dwóch wariantach: pełny ze statystykami oraz same algorytmy w tabeli NxN
- Algorytm ukryty w trakcie pauzy między przypadkami
- Poprawka Android back po zapisaniu wyników sesji

### v2.01 (2026-08-08)

- Statystyki dzienne liczone w czasie lokalnym
- Poprawki okna edycji i przepływu po zakończeniu gry; okno edycji wyżej na telefonie
- Filtry w statystykach zostają po edycji algorytmu
- Poprawki WCAG: kontrast, wielkość elementów dotykowych, dostępność pomocy

### v2.0 (2026-08-07)

- Nowy system kolorów — czysta paleta z niebieskim akcentem (#5B8CFF)
- Oddzielne kolory dla każdej kategorii (szybkie, wolne, niestabilne, regres, nowe, trudne)
- Kategoria "Trudne" z obramowaniem zamiast wypełnienia
- Przyciski trybów (Słabe punkty, Utrzymanie, Nowe) z kolorowym border-left
- Ikona motywu: SVG słońce/księżyc zamiast emoji
- Nowe ikony aplikacji (SVG, maskable, apple-touch-icon)
- Kontrast przycisków spełnia WCAG AA (4.5:1)
- Skrypt check-contrast.js do weryfikacji kontrastu

### v1.0 (2026-08-02)

- Tryb "Z inwersją" — po każdym przypadku od razu pojawia się jego inwersja (AB → BA)
- Przycisk Reset do czyszczenia selekcji przypadków
- Sekcja "Brak algorytmu" w statystykach — widok przypadków bez algorytmu z możliwością dodania
- Parity: nowy typ przypadków (jeden target)
- Reset wyników dla poszczególnych przypadków
- Re-import zachowuje istniejące wyniki
- Ulepszone UI: większe elementy dotykowe (~48px), custom strzałka w selectach
- Zaktualizowane instrukcje
- Tryb Nauka (flashcards) z oceną Łatwe/Trudne
- Checkbox "trudny" w modalu edycji algorytmu
- Pomijanie przypadków bez algorytmów (pusty alg = wyłączony przypadek)
- Sortowalna tabela przypadków w statystykach
- Podgląd wybranych przypadków przed startem
- Polska terminologia w UI
- Edycja algorytmu w trakcie nauki
- Link do GitHub w stopce

### v0.9 (2026-07-31)

- Pierwsza wersja
