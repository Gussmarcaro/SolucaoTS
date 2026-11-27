// Aplica o tema antes da renderização para evitar "flash" (FOUC).
// Arquivo próprio, e não <script> embutido no index.html: a política de
// segurança (CSP) do nginx só permite scripts servidos pelo próprio site.
(function () {
  try {
    var stored = localStorage.getItem('@SolucaoTS:theme');
    var theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    document.documentElement.classList.add(theme);
  } catch (e) {}
})();
