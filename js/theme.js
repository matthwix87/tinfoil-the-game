// theme.js — switch between light, dark, or "follow my device".
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else delete root.dataset.theme; // follow the device setting
}
