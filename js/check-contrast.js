#!/usr/bin/env node
// Sprawdza kontrast WCAG dla par kolorów zdefiniowanych w palecie BLD AlgDriller.
// Uruchom: node check-contrast.js
// Exit code 1, jeśli którakolwiek para nie spełnia oczekiwanego wyniku -> wygodne w CI / pre-commit.
//
// To jest "źródło prawdy" dla docelowej palety (włącznie z poprawkami
// ustalonymi podczas audytu) — niezależnie od tego, czy CSS w repo już
// je wdrożył. Jeśli implementacja jeszcze nie nadąża, uruchom ten skrypt,
// żeby zobaczyć dokładnie co jest jeszcze do zrobienia.

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function relLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1));
  const l2 = relLuminance(hexToRgb(hex2));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// type: 'text'    -> zwykły tekst, próg 4.5:1
//       'large'   -> duży tekst (≥24px), próg 3:1
//       'nontext' -> granice komponentów UI wg WCAG 1.4.11 (bordery, ikony), próg 3:1
// expectFail: true -> ten wpis CELOWO nie powinien spełniać progu (dokumentuje
//                      odrzucony wariant albo błąd, który naprawiliśmy)
const pairs = [
  // ==================== DARK — tekst ====================
  {
    theme: "dark",
    label: "text-primary / bg",
    fg: "#E8E9ED",
    bg: "#14161C",
    type: "text",
  },
  {
    theme: "dark",
    label: "text-primary / surface",
    fg: "#E8E9ED",
    bg: "#1E212B",
    type: "text",
  },
  {
    theme: "dark",
    label: "text-secondary / surface",
    fg: "#a0a6b8",
    bg: "#1E212B",
    type: "text",
  },
  {
    theme: "dark",
    label: "accent-on / accent-button (btn primary)",
    fg: "#020a1f",
    bg: "#5B8CFF",
    type: "text",
  },
  {
    theme: "dark",
    label: "badge szybkie",
    fg: "#4ADE80",
    bg: "#0B2A18",
    type: "text",
  },
  {
    theme: "dark",
    label: "badge srednie",
    fg: "#a0a6b8",
    bg: "#262A33",
    type: "text",
  },
  {
    theme: "dark",
    label: "badge wolne",
    fg: "#FBBF24",
    bg: "#1F1A08",
    type: "text",
  },
  {
    theme: "dark",
    label: "badge niestabilne",
    fg: "#FB923C",
    bg: "#241407",
    type: "text",
  },
  {
    theme: "dark",
    label: "badge regres",
    fg: "#F87171",
    bg: "#2A1010",
    type: "text",
  },
  {
    theme: "dark",
    label: "badge nowe",
    fg: "#8fb0ff",
    bg: "#0E1A33",
    type: "text",
  },
  {
    theme: "dark",
    label: "cat-trudne border / surface-raised",
    fg: "#a0a6b8",
    bg: "#2A2E3A",
    type: "large",
  },

  // ==================== LIGHT — tekst ====================
  {
    theme: "light",
    label: "text-primary / bg",
    fg: "#14161C",
    bg: "#F7F8FA",
    type: "text",
  },
  {
    theme: "light",
    label: "text-primary / surface (white)",
    fg: "#14161C",
    bg: "#FFFFFF",
    type: "text",
  },
  {
    theme: "light",
    label: "text-secondary / surface (white)",
    fg: "#5A5F6E",
    bg: "#FFFFFF",
    type: "text",
  },
  {
    theme: "light",
    label: "white text / accent-button (btn primary)",
    fg: "#FFFFFF",
    bg: "#2a53ad",
    type: "text",
  },
  {
    theme: "light",
    label: "REGRESJA: white text / accent OLD (stare tło przycisku)",
    fg: "#FFFFFF",
    bg: "#5B8CFF",
    type: "text",
    expectFail: true,
  },
  {
    theme: "light",
    label: "badge szybkie",
    fg: "#27500A",
    bg: "#E8FBEF",
    type: "text",
  },
  {
    theme: "light",
    label: "badge srednie",
    fg: "#5A5F6E",
    bg: "#EEF0F3",
    type: "text",
  },
  {
    theme: "light",
    label: "badge wolne",
    fg: "#633806",
    bg: "#FEF6E0",
    type: "text",
  },
  {
    theme: "light",
    label: "badge niestabilne",
    fg: "#712B13",
    bg: "#FEEEE0",
    type: "text",
  },
  {
    theme: "light",
    label: "badge regres",
    fg: "#791F1F",
    bg: "#FDEAEA",
    type: "text",
  },
  {
    theme: "light",
    label: "badge nowe",
    fg: "#0C447C",
    bg: "#E9EFFC",
    type: "text",
  },
  {
    theme: "light",
    label: "cat-trudne border / surface-raised",
    fg: "#5A5F6E",
    bg: "#EDEFF3",
    type: "large",
  },

  // ==================== NON-TEXT — btn-secondary border ====================
  {
    theme: "light",
    label: "btn-secondary border (#5A5F6E) vs page bg",
    fg: "#5A5F6E",
    bg: "#F7F8FA",
    type: "nontext",
  },
  {
    theme: "light",
    label: "btn-secondary border (#5A5F6E) vs card white",
    fg: "#5A5F6E",
    bg: "#FFFFFF",
    type: "nontext",
  },
  {
    theme: "dark",
    label: "btn-secondary border (--text-secondary #a0a6b8) vs card #1E212B",
    fg: "#a0a6b8",
    bg: "#1E212B",
    type: "nontext",
  },

  {
    theme: "light",
    label:
      "REGRESJA: btn-secondary bez bordera, wariant 1 (tło #D8DCE5) vs page bg",
    fg: "#D8DCE5",
    bg: "#F7F8FA",
    type: "nontext",
    expectFail: true,
  },
  {
    theme: "light",
    label:
      "REGRESJA: btn-secondary bez bordera, wariant 2 (border #C0C4CE) vs page bg",
    fg: "#C0C4CE",
    bg: "#F7F8FA",
    type: "nontext",
    expectFail: true,
  },
  {
    theme: "light",
    label:
      "REGRESJA: btn-secondary bez bordera, wariant 2 hover (#A0A4AE) vs page bg",
    fg: "#A0A4AE",
    bg: "#F7F8FA",
    type: "nontext",
    expectFail: true,
  },
  {
    theme: "dark",
    label:
      "REGRESJA: btn-secondary bez bordera, tylko tło (#2A2E3A) vs card (#1E212B)",
    fg: "#2A2E3A",
    bg: "#1E212B",
    type: "nontext",
    expectFail: true,
  },

  // ==================== NON-TEXT — border-left w przyciskach trybu ====================
  // vs surface-raised (tło przycisku): dark #2A2E3A, light #EDEFF3
  {
    theme: "dark",
    label: "border-left 'Słabe punkty' (#F87171) vs surface-raised",
    fg: "#F87171",
    bg: "#2A2E3A",
    type: "nontext",
  },
  {
    theme: "dark",
    label: "border-left 'Utrzymanie' (#4ADE80) vs surface-raised",
    fg: "#4ADE80",
    bg: "#2A2E3A",
    type: "nontext",
  },
  {
    theme: "dark",
    label: "border-left 'Nowe' (#5B8CFF) vs surface-raised",
    fg: "#5B8CFF",
    bg: "#2A2E3A",
    type: "nontext",
  },

  {
    theme: "light",
    label: "border-left 'Słabe punkty' (#E24B4A) vs surface-raised",
    fg: "#E24B4A",
    bg: "#EDEFF3",
    type: "nontext",
  },
  {
    theme: "light",
    label: "border-left 'Utrzymanie' (#4D7315, poprawka) vs surface-raised",
    fg: "#4D7315",
    bg: "#EDEFF3",
    type: "nontext",
  },
  {
    theme: "light",
    label:
      "border-left 'Nowe' (#2a53ad, poprawka = accent-button) vs surface-raised",
    fg: "#2a53ad",
    bg: "#EDEFF3",
    type: "nontext",
  },

  {
    theme: "light",
    label:
      "REGRESJA: border-left 'Utrzymanie' STARY kolor (#639922) vs surface-raised",
    fg: "#639922",
    bg: "#EDEFF3",
    type: "nontext",
    expectFail: true,
  },
  {
    theme: "light",
    label:
      "REGRESJA: border-left 'Nowe' STARY kolor (#5B8CFF) vs surface-raised",
    fg: "#5B8CFF",
    bg: "#EDEFF3",
    type: "nontext",
    expectFail: true,
  },
];

const THRESH = { text: 4.5, large: 3.0, nontext: 3.0 };

let allPass = true;
console.log("Kontrast WCAG — BLD AlgDriller\n");
console.log("theme  | wynik | próg  | status | opis");
console.log("-------|-------|-------|--------|-----");

for (const p of pairs) {
  const ratio = contrastRatio(p.fg, p.bg);
  const threshold = THRESH[p.type];
  const meetsThreshold = ratio >= threshold;
  // Dla wpisów oznaczonych expectFail chcemy, żeby NIE spełniały progu
  // (to są odrzucone warianty / naprawione błędy — test potwierdza, że
  // słusznie je odrzuciliśmy / naprawiliśmy).
  const pass = p.expectFail ? !meetsThreshold : meetsThreshold;
  if (!pass) allPass = false;
  const statusLabel = p.expectFail
    ? (pass ? " OK   " : " FAIL ") + " (oczekiwano FAIL)"
    : pass
      ? " OK   "
      : " FAIL ";
  console.log(
    `${p.theme.padEnd(6)} | ${ratio.toFixed(2).padStart(5)} | ${threshold.toFixed(1).padStart(5)} | ${statusLabel} | ${p.label}`,
  );
}

console.log(
  "\n" +
    (allPass
      ? "✓ Wszystkie pary spełniają oczekiwany wynik (AA / non-text / regresje)."
      : "✗ Coś nie zgadza się z oczekiwaniami — patrz FAIL powyżej."),
);
process.exit(allPass ? 0 : 1);
