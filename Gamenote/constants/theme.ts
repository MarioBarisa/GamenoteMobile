export const colors = {
  light: {
    background: "#ffffff",
    backgroundModal: "#F2F2F7",
    onboarding: "#F2F2F7",
    card: "#F2F2F7",
    text: "#000000",
    secondaryText: "rgba(60,60,67,0.6)",
    accent: "#007AFF",
    destructive: "#FF3B30",
  },
  dark: {
    background: "#000000",
    backgroundModal: "rgba(28,28,30,0.85)",
    onboarding: "rgba(28,28,30,0.85)",
    card: "rgba(28,28,30,0.85)",
    text: "#FFFFFF",
    secondaryText: "rgba(235,235,245,0.6)",
    accent: "#0A84FF",
    destructive: "#FF453A",
  },
};

// Unaprijed ponuđene boje naglaska
export const ACCENT_PRESETS = [
  "#AF52DE",
  "#F32D3E",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#00C7BE",
];

// Provjera hex boje oblika #RRGGBB
export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

// Vrati uredan #RRGGBB ili null
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (isValidHexColor(withHash)) return withHash.toUpperCase();
  if (/^#[0-9A-Fa-f]{8}$/.test(withHash)) return withHash.slice(0, 7).toUpperCase();
  return null;
}
