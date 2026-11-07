// Applies a saved light/dark choice before the first paint, so the page never flashes the wrong theme.
// A separate file rather than an inline script, so the Content-Security-Policy can stay script-src 'self'.
try {
  const theme = localStorage.getItem('sudoku:theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // Storage unavailable: follow the system setting.
}
