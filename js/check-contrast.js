#!/usr/bin/env node
// Sprawdza kontrast WCAG dla par kolorów zdefiniowanych w palecie BLD AlgDriller.
// Uruchom: node check-contrast.js
// Exit code 1, jeśli którakolwiek para nie spełnia progu AA -> wygodne w CI / pre-commit.

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

// theme: dark | light
// type: 'text' (próg 4.5:1) | 'large' (próg 3:1, duży tekst / ikony / obwódki UI)
const pairs = [
  // ---- DARK ----
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
    fg: "#9096A8",
    bg: "#1E212B",
    type: "text",
  },
  {
    theme: "dark",
    label: "accent-on / accent-button (btn primary)",
    fg: "#052047",
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
    fg: "#5B8CFF",
    bg: "#0E1A33",
    type: "text",
  },
  {
    theme: "dark",
    label: "cat-trudne border / surface-raised",
    fg: "#9096A8",
    bg: "#2A2E3A",
    type: "large",
  },

  // ---- LIGHT ----
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
    bg: "#3568D6",
    type: "text",
  },
  {
    theme: "light",
    label: "white text / accent OLD (regression check)",
    fg: "#FFFFFF",
    bg: "#5B8CFF",
    type: "text",
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
];

const THRESH = { text: 4.5, large: 3.0 };

let allPass = true;
console.log("Kontrast WCAG — BLD AlgDriller\n");
console.log("theme  | wynik | próg  | status | opis");
console.log("-------|-------|-------|--------|-----");

for (const p of pairs) {
  const ratio = contrastRatio(p.fg, p.bg);
  const threshold = THRESH[p.type];
  const pass = ratio >= threshold;
  if (!pass) allPass = false;
  console.log(
    `${p.theme.padEnd(6)} | ${ratio.toFixed(2).padStart(5)} | ${threshold.toFixed(1).padStart(5)} | ${pass ? " OK   " : " FAIL "} | ${p.label}`,
  );
}

console.log(
  "\n" +
    (allPass
      ? "✓ Wszystkie pary spełniają WCAG AA."
      : "✗ Są pary poniżej progu AA — patrz FAIL powyżej."),
);
process.exit(allPass ? 0 : 1);
