const app = document.querySelector("[data-search-app]");
const input = app?.querySelector("[data-search-input]");
const category = app?.querySelector("[data-search-category]");
const language = app?.querySelector("[data-search-language]");
const results = app?.querySelector("[data-search-results]");
const labels = {
  veg: app?.dataset.labelVeg || "Veg",
  nonVeg: app?.dataset.labelNonVeg || "Non-Veg",
  noResults: app?.dataset.labelNoResults || "No recipes found.",
  searchUnavailable: app?.dataset.labelSearchUnavailable || "Search index could not be loaded."
};
let index = [];
let activeResult = -1;

const params = new URLSearchParams(window.location.search);
if (input && params.has("q")) input.value = params.get("q");

function debounce(callback, delay = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function highlight(value, query) {
  const safeValue = escapeHtml(value);
  if (!query) return safeValue;
  return safeValue.replace(new RegExp(`(${escapeRegExp(escapeHtml(query))})`, "ig"), "<mark>$1</mark>");
}

function searchableText(item) {
  return [
    item.title,
    item.summary,
    item.excerpt,
    item.body,
    ...(item.tags || []),
    ...(item.ingredients || []),
    ...(item.mediaTitles || [])
  ].join(" ").toLowerCase();
}

function matchSnippet(item, query) {
  const fields = [
    item.title,
    item.summary,
    ...(item.ingredients || []),
    ...(item.tags || []),
    ...(item.mediaTitles || []),
    item.excerpt,
    item.body
  ].filter(Boolean);
  const source = fields.find((field) => String(field).toLowerCase().includes(query)) || item.summary || item.excerpt || "";
  const lower = String(source).toLowerCase();
  const index = lower.indexOf(query);
  if (!query || index < 0) return source;
  const start = Math.max(0, index - 56);
  const end = Math.min(String(source).length, index + query.length + 88);
  return `${start > 0 ? "..." : ""}${String(source).slice(start, end)}${end < String(source).length ? "..." : ""}`;
}

function render() {
  if (!app || !input || !category || !language || !results) return;
  const query = input.value.trim().toLowerCase();
  const categoryValue = category.value;
  const languageValue = language.value;
  const nextParams = new URLSearchParams(window.location.search);

  if (query) nextParams.set("q", query);
  else nextParams.delete("q");
  history.replaceState(null, "", `${window.location.pathname}${nextParams.toString() ? `?${nextParams}` : ""}`);

  const matches = index
    .filter((item) => languageValue === "all" || item.lang === languageValue)
    .filter((item) => categoryValue === "all" || item.category === categoryValue)
    .filter((item) => !query || searchableText(item).includes(query))
    .slice(0, 30);

  activeResult = -1;
  results.innerHTML = matches.length
    ? matches.map((item) => `
      <article class="search-result" role="listitem" tabindex="-1">
        <div class="meta-row">
          <span class="pill">${item.category === "non-veg" ? escapeHtml(labels.nonVeg) : escapeHtml(labels.veg)}</span>
          <span>${item.lang}</span>
        </div>
        <h2><a href="${item.url}">${highlight(item.title, query)}</a></h2>
        <p>${highlight(matchSnippet(item, query), query)}</p>
        <div class="tag-row">${(item.tags || []).slice(0, 5).map((tag) => `<span>#${highlight(tag, query)}</span>`).join("")}</div>
      </article>
    `).join("")
    : `<p class="search-result">${escapeHtml(labels.noResults)}</p>`;
}

async function initSearch() {
  if (!app) return;
  const root = document.body.dataset.siteRoot || "/";
  try {
    const response = await fetch(new URL("search-index.json", window.location.origin + root));
    if (!response.ok) throw new Error(`Search index returned ${response.status}`);
    index = await response.json();
    render();
  } catch (error) {
    if (results) {
      results.innerHTML = `<p class="search-result">${escapeHtml(labels.searchUnavailable)}</p>`;
    }
    console.error(error);
  }
}

const renderDebounced = debounce(render);
input?.addEventListener("input", renderDebounced);
category?.addEventListener("change", render);
language?.addEventListener("change", render);

app?.addEventListener("keydown", (event) => {
  const cards = [...app.querySelectorAll(".search-result")];
  if (!cards.length || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
  if (event.key === "Enter" && activeResult >= 0) {
    cards[activeResult].querySelector("a")?.click();
    return;
  }
  event.preventDefault();
  activeResult += event.key === "ArrowDown" ? 1 : -1;
  activeResult = Math.max(0, Math.min(cards.length - 1, activeResult));
  cards[activeResult].focus();
});

initSearch();
