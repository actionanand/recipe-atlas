const storage = {
  get(key, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      return undefined;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      return undefined;
    }
  }
};

const themeSelect = document.querySelector("[data-theme-switch]");
if (themeSelect) {
  const savedTheme = storage.get("recipeatlas.theme", "system");
  themeSelect.value = savedTheme;
  document.documentElement.dataset.theme = savedTheme;
  themeSelect.addEventListener("change", () => {
    document.documentElement.dataset.theme = themeSelect.value;
    storage.set("recipeatlas.theme", themeSelect.value);
  });
}

const languageSwitch = document.querySelector("[data-language-switch]");
if (languageSwitch) {
  languageSwitch.addEventListener("change", () => {
    const option = languageSwitch.selectedOptions[0];
    storage.set("recipeatlas.language", option.dataset.lang || "");
    if (option.dataset.unavailable === "true") {
      storage.set("recipeatlas.translationNotice", "Translation is unavailable; showing the available language instead.");
    }
    window.location.href = option.value;
  });
}

const notice = storage.get("recipeatlas.translationNotice");
const noticeTarget = document.querySelector("[data-translation-toast]");
if (notice && noticeTarget) {
  noticeTarget.textContent = notice;
  noticeTarget.hidden = false;
  storage.remove("recipeatlas.translationNotice");
}

document.querySelectorAll("[data-copyright-year]").forEach((node) => {
  const startYear = Number(node.dataset.startYear) || 2026;
  const currentYear = new Date().getFullYear();
  node.textContent = currentYear > startYear ? `${startYear} - ${currentYear}` : String(startYear);
});

const nav = document.querySelector("#site-nav");
const menuToggle = document.querySelector(".mobile-menu-toggle");
if (nav && menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-category-filter]").forEach((group) => {
  const targetRoot = group.parentElement?.querySelector("[data-filter-targets]") || document;
  group.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    const filter = button.dataset.filter;
    group.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    targetRoot.querySelectorAll("[data-category]").forEach((card) => {
      const categories = (card.dataset.category || "").split(/\s+/).filter(Boolean);
      card.hidden = filter !== "all" && !categories.includes(filter);
    });
  });
});

document.querySelectorAll("[data-collapse-toggle]").forEach((button) => {
  const key = `recipeatlas.collapse.${button.dataset.collapseToggle}`;
  const panel = document.querySelector(`[data-collapse-panel="${button.dataset.collapseToggle}"]`);
  const icon = button.querySelector(".material-symbols-rounded");
  const collapsed = storage.get(key) === "true";
  if (panel) {
    panel.hidden = collapsed;
    button.setAttribute("aria-expanded", String(!collapsed));
    if (icon) icon.textContent = collapsed ? "expand_more" : "expand_less";
  }
  button.addEventListener("click", () => {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    storage.set(key, String(panel.hidden));
    button.setAttribute("aria-expanded", String(!panel.hidden));
    if (icon) icon.textContent = panel.hidden ? "expand_more" : "expand_less";
  });
});

document.querySelectorAll("[data-random-recipe]").forEach((button) => {
  button.addEventListener("click", () => {
    const urls = JSON.parse(button.dataset.recipes || "[]");
    if (!urls.length) return;
    window.location.href = urls[Math.floor(Math.random() * urls.length)];
  });
});

const ingredientsPanel = document.querySelector("[data-ingredients-panel]");
if (ingredientsPanel) {
  const scaleInput = ingredientsPanel.querySelector("[data-scale-input]");
  const searchInput = ingredientsPanel.querySelector("[data-ingredient-search]");
  const quantities = ingredientsPanel.querySelectorAll("[data-quantity]");

  const formatQuantity = (value) => {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0$/, "");
  };

  scaleInput?.addEventListener("input", () => {
    const factor = Number(scaleInput.value) || 1;
    quantities.forEach((node) => {
      const base = Number(node.dataset.quantity);
      if (Number.isFinite(base)) node.textContent = formatQuantity(base * factor);
    });
  });

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    ingredientsPanel.querySelectorAll("[data-ingredient-name]").forEach((item) => {
      item.classList.toggle("is-muted", Boolean(query) && !item.dataset.ingredientName.includes(query));
    });
  });

  ingredientsPanel.querySelector("[data-copy-ingredients]")?.addEventListener("click", async () => {
    const text = [...ingredientsPanel.querySelectorAll(".ingredient-item")]
      .map((item) => item.innerText.trim())
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard?.writeText(text);
  });

  ingredientsPanel.querySelector("[data-print-recipe]")?.addEventListener("click", () => window.print());
}

const progress = document.querySelector("[data-reading-progress]");
const backToTop = document.querySelector("[data-back-to-top]");
if (progress || backToTop) {
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    if (progress) progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    backToTop?.classList.toggle("is-visible", window.scrollY > 500);
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
}

backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

const escapeHtmlValue = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const highlightLiveMatch = (value, query) => {
  const safeValue = escapeHtmlValue(value);
  if (!query) return safeValue;
  const safeQuery = escapeHtmlValue(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safeValue.replace(new RegExp(`(${safeQuery})`, "ig"), "<mark>$1</mark>");
};

const liveSearchableText = (item) =>
  [
    item.title,
    item.summary,
    item.excerpt,
    item.body,
    ...(item.tags || []),
    ...(item.ingredients || []),
    ...(item.mediaTitles || [])
  ].join(" ").toLowerCase();

const liveMatchSnippet = (item, query) => {
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
  const start = Math.max(0, index - 48);
  const end = Math.min(String(source).length, index + query.length + 72);
  return `${start > 0 ? "..." : ""}${String(source).slice(start, end)}${end < String(source).length ? "..." : ""}`;
};

const fetchSearchIndex = (() => {
  let promise;
  return () => {
    if (!promise) {
      const root = document.body.dataset.siteRoot || "/";
      promise = fetch(new URL("search-index.json", window.location.origin + root)).then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json();
      });
    }
    return promise;
  };
})();

document.querySelectorAll("[data-live-search]").forEach((container) => {
  const form = container.querySelector("form");
  const input = container.querySelector("input[type='search']");
  const results = container.querySelector("[data-live-search-results]");
  const lang = container.dataset.liveSearchLang || document.documentElement.lang;
  const noMatchesLabel = container.dataset.noMatches || "No matches";
  const unavailableLabel = container.dataset.searchUnavailable || "Search index unavailable";
  if (!input || !results) return;

  const closeLiveSearch = () => {
    results.hidden = true;
    results.innerHTML = "";
  };

  const renderLiveSearch = async () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      closeLiveSearch();
      return;
    }

    try {
      const items = await fetchSearchIndex();
      const matches = items
        .filter((item) => item.lang === lang)
        .filter((item) => liveSearchableText(item).includes(query))
        .slice(0, 5);

      results.hidden = false;
      results.innerHTML = matches.length
        ? matches.map((item) => `
          <a class="live-search-item" href="${item.url}">
            <strong>${highlightLiveMatch(item.title, query)}</strong>
            <span>${highlightLiveMatch(liveMatchSnippet(item, query), query)}</span>
          </a>
        `).join("")
        : `<p class="live-search-empty">${escapeHtml(noMatchesLabel)}</p>`;
    } catch {
      results.hidden = false;
      results.innerHTML = `<p class="live-search-empty">${escapeHtml(unavailableLabel)}</p>`;
    }
  };

  input.addEventListener("input", renderLiveSearch);
  input.addEventListener("focus", renderLiveSearch);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    input.value = "";
    closeLiveSearch();
    input.blur();
  });
  form?.addEventListener("submit", () => {
    closeLiveSearch();
  });
});

const homeSearchInput = document.querySelector("[data-live-search] input[type='search']");
if (homeSearchInput) {
  const searchContainer = homeSearchInput.closest("[data-live-search]");
  homeSearchInput.placeholder = searchContainer?.dataset.placeholder || "Search recipes - press /";
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    const isTyping = target instanceof HTMLElement
      && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (isTyping) return;

    event.preventDefault();
    homeSearchInput.focus();
    homeSearchInput.select();
  });
}

const providerUrl = (provider, id, start = "") => {
  if (provider === "youtube" || provider === "youtube-short") {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}${start ? `&t=${encodeURIComponent(start)}s` : ""}`;
  }
  if (provider === "instagram") return `https://www.instagram.com/p/${encodeURIComponent(id)}/`;
  return "#";
};

const embedUrl = (provider, id, start = "", muted = false) => {
  const params = new URLSearchParams();
  params.set("rel", "0");
  if (start) params.set("start", start);
  if (muted) params.set("mute", "1");

  if (provider === "youtube" || provider === "youtube-short") {
    params.set("enablejsapi", "1");
    params.set("origin", window.location.origin);
    params.set("widget_referrer", window.location.href);
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params.toString()}`;
  }
  if (provider === "instagram") return `https://www.instagram.com/p/${encodeURIComponent(id)}/embed`;
  return "";
};

const loadEmbed = (container, options = {}) => {
  if (container.dataset.loaded) return container.querySelector("iframe");
  const provider = container.dataset.provider;
  const id = container.dataset.id;
  const title = container.dataset.title || provider;
  const start = container.dataset.start;
  const src = embedUrl(provider, id, start, options.muted);

  if (!src) return;
  container.innerHTML = `<iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="${title.replaceAll('"', "&quot;")}" src="${src}"></iframe>`;
  container.dataset.loaded = "true";
  return container.querySelector("iframe");
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const makeFloatingPlayerDraggable = (shell) => {
  const handle = shell.querySelector(".floating-player__bar");
  if (!handle) return;

  let offsetX = 0;
  let offsetY = 0;

  const move = (event) => {
    const rect = shell.getBoundingClientRect();
    const maxX = Math.max(8, window.innerWidth - rect.width - 8);
    const maxY = Math.max(8, window.innerHeight - rect.height - 8);
    shell.style.left = `${clamp(event.clientX - offsetX, 8, maxX)}px`;
    shell.style.top = `${clamp(event.clientY - offsetY, 8, maxY)}px`;
  };

  const stop = () => {
    shell.classList.remove("is-dragging");
    document.removeEventListener("pointermove", move);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a")) return;
    const rect = shell.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    shell.style.left = `${rect.left}px`;
    shell.style.top = `${rect.top}px`;
    shell.style.right = "auto";
    shell.style.bottom = "auto";
    shell.classList.add("is-dragging");
    event.preventDefault();
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop, { once: true });
    document.addEventListener("pointercancel", stop, { once: true });
  });
};

const openFloatingPlayer = (resource) => {
  const container = resource.querySelector(".media-embed");
  const iframe = container ? loadEmbed(container) : null;
  if (!iframe) return;

  document.querySelector("[data-floating-player]")?.remove();
  const shell = document.createElement("aside");
  shell.className = "floating-player";
  shell.dataset.floatingPlayer = "true";
  shell.dataset.provider = container.dataset.provider || "";
  shell.innerHTML = `
    <div class="floating-player__bar">
      <strong>${escapeHtmlValue(container.dataset.title || "Video")}</strong>
      <button type="button" class="icon-button" data-close-floating-player aria-label="Close mini player">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </div>
    <iframe loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="${escapeHtmlValue(iframe.title || container.dataset.title || "Video")}" src="${escapeHtmlValue(iframe.getAttribute("src") || "")}"></iframe>
  `;
  document.body.append(shell);
  shell.querySelector("[data-close-floating-player]")?.addEventListener("click", () => shell.remove());
  makeFloatingPlayerDraggable(shell);
};

const embedObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadEmbed(entry.target);
          embedObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "250px" })
  : null;

document.querySelectorAll(".media-embed").forEach((container) => {
  container.querySelector("[data-load-embed]")?.addEventListener("click", () => loadEmbed(container));
  if (embedObserver) embedObserver.observe(container);
});

document.querySelectorAll(".video-resource").forEach((resource) => {
  const container = resource.querySelector(".media-embed");
  const watch = resource.querySelector("[data-watch-embed]");
  const mute = resource.querySelector("[data-mute-embed]");
  const pip = resource.querySelector("[data-pip-embed]");
  if (!container) return;

  if (watch) {
    watch.href = providerUrl(container.dataset.provider, container.dataset.id, container.dataset.start);
    if (container.dataset.provider === "instagram") watch.textContent = "Open on Instagram";
  }

  mute?.addEventListener("click", () => {
    container.dataset.loaded = "";
    loadEmbed(container, { muted: true });
  });

  pip?.addEventListener("click", async () => {
    openFloatingPlayer(resource);
  });

  container.addEventListener("load", () => {
    mute?.removeAttribute("disabled");
    pip?.removeAttribute("disabled");
  }, true);

  if (container.dataset.loaded && container.querySelector("iframe")) {
    mute?.removeAttribute("disabled");
    pip?.removeAttribute("disabled");
  }
});
