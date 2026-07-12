const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "default";

import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs").then(({ default: mermaid }) => {
  mermaid.initialize({
    startOnLoad: true,
    theme
  });
});
