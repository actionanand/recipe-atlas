import { imageRegistry, socialImageRegistry } from "./src/data/images/registry.js";

const DEFAULT_LANGUAGE = "ta";
const VALID_CATEGORIES = new Set(["veg", "non-veg"]);
const PAGE_SIZE = 6;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function recipeLanguage(inputPath = "") {
  const match = inputPath.match(/[\\/]recipes[\\/]([^\\/]+)[\\/]/);
  return match ? match[1] : DEFAULT_LANGUAGE;
}

function recipeSlug(item) {
  return item.data.slug || item.fileSlug;
}

function recipeTranslationId(item) {
  return item.data.translationKey || item.fileSlug;
}

function normalizeRecipe(item) {
  const lang = recipeLanguage(item.inputPath);
  item.data.lang = lang;
  item.data.recipeSlug = recipeSlug(item);
  item.data.translationId = recipeTranslationId(item);

  if (!item.data.title || !item.data.category || !Array.isArray(item.data.ingredients)) {
    throw new Error(
      `Recipe ${item.inputPath} must include title, category, and ingredients frontmatter.`
    );
  }

  if (!VALID_CATEGORIES.has(item.data.category)) {
    throw new Error(
      `Recipe ${item.inputPath} uses invalid category "${item.data.category}". Use veg or non-veg.`
    );
  }

  if (item.data.cover && !imageRegistry[item.data.cover]) {
    console.warn(`[RecipeAtlas] Missing cover image key "${item.data.cover}" in ${item.inputPath}`);
  }

  return item;
}

function sortedRecipes(recipes = []) {
  return [...recipes].sort((a, b) => {
    const aDate = new Date(a.data.published || a.date || 0).getTime();
    const bDate = new Date(b.data.published || b.date || 0).getTime();
    return bDate - aDate;
  });
}

function plainText(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryLabel(category) {
  return category === "non-veg" ? "Non-Veg" : "Veg";
}

export default function eleventyConfig(config) {
  config.addPassthroughCopy({ "src/assets": "assets" });
  config.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });

  config.addShortcode("recipeImage", function recipeImage(key, alt = "", caption = "") {
    const image = imageRegistry[key];
    if (!image) {
      console.warn(`[RecipeAtlas] Invalid recipeImage key "${key}" in ${this.page?.inputPath || "unknown file"}`);
      return `<figure class="recipe-figure recipe-figure--missing"><figcaption>Image unavailable: ${escapeHtml(key)}</figcaption></figure>`;
    }

    const escapedAlt = escapeHtml(alt || key);
    const captionMarkup = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
    return `<figure class="recipe-figure"><img src="${escapeHtml(image)}" alt="${escapedAlt}" loading="lazy" decoding="async">${captionMarkup}</figure>`;
  });

  config.addFilter("json", (value) => JSON.stringify(value));
  config.addFilter("urlencode", (value) => encodeURIComponent(value));
  config.addFilter("plainText", plainText);
  config.addFilter("excerpt", (value, words = 28) => plainText(value).split(" ").slice(0, words).join(" "));
  config.addFilter("readingTime", (value) => Math.max(1, Math.ceil(plainText(value).split(/\s+/).length / 180)));
  config.addFilter("categoryLabel", categoryLabel);
  config.addFilter("languageMeta", (languages, code) => languages.find((language) => language.code === code) || languages[0]);
  config.addFilter("localizedUrl", (currentUrl = "/", currentLanguage = DEFAULT_LANGUAGE, targetLanguage = DEFAULT_LANGUAGE) => {
    const targetCode = targetLanguage || DEFAULT_LANGUAGE;
    const cleanUrl = currentUrl || "/";

    if (targetCode === currentLanguage) return cleanUrl;

    if (targetCode === DEFAULT_LANGUAGE) {
      return cleanUrl.replace(new RegExp(`^/${currentLanguage}(?=/|$)`), "") || "/";
    }

    if (currentLanguage === DEFAULT_LANGUAGE) {
      return cleanUrl === "/" ? `/${targetCode}/` : `/${targetCode}${cleanUrl}`;
    }

    return cleanUrl.replace(new RegExp(`^/${currentLanguage}(?=/|$)`), `/${targetCode}`);
  });
  config.addFilter("imageFor", (key) => imageRegistry[key] || imageRegistry.DEFAULT_IMG || "");
  config.addFilter("socialImageFor", (key) => socialImageRegistry[key] || socialImageRegistry.DEFAULT_IMG || "");
  config.addFilter("hasMermaid", (content) => String(content).includes("class=\"mermaid\""));
  config.addFilter("dateIso", (value) => (value ? new Date(value).toISOString().slice(0, 10) : ""));
  config.addFilter("dateDisplay", (value, locale = "en") => {
    if (!value) return "";
    return new Intl.DateTimeFormat(locale === "ta" ? "ta-IN" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(value));
  });
  config.addFilter("recipesForLang", (recipes, lang) => sortedRecipes(recipes.filter((recipe) => recipe.data.lang === lang)));
  config.addFilter("featuredForLang", (recipes, lang) => sortedRecipes(recipes.filter((recipe) => recipe.data.lang === lang && recipe.data.featured)));
  config.addFilter("latest", (recipes, count = 6) => sortedRecipes(recipes).slice(0, count));
  config.addFilter("translationFor", (recipes, key, lang) => recipes.find((recipe) => recipe.data.translationId === key && recipe.data.lang === lang));
  config.addFilter("findByUrl", (recipes, url) => recipes.find((recipe) => recipe.url === url));
  config.addFilter("relatedRecipes", (recipes, current) => {
    if (!current?.data) return [];
    const tags = new Set(current.data.tags || []);
    return recipes
      .filter((recipe) => recipe.url !== current.url && recipe.data.lang === current.data.lang)
      .map((recipe) => ({
        recipe,
        score: (recipe.data.tags || []).filter((tag) => tags.has(tag)).length + (recipe.data.category === current.data.category ? 1 : 0)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.recipe);
  });
  config.addFilter("tagCountsForLang", (recipes, lang) => {
    const counts = new Map();
    for (const recipe of recipes.filter((item) => item.data.lang === lang)) {
      for (const tag of recipe.data.tags || []) {
        const entry = counts.get(tag) || { count: 0, categories: new Set() };
        entry.count += 1;
        entry.categories.add(recipe.data.category);
        counts.set(tag, entry);
      }
    }
    return [...counts.entries()]
      .map(([tag, entry]) => ({ tag, count: entry.count, categories: [...entry.categories].sort() }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });
  config.addFilter("recipesByTag", (recipes, lang, tag) =>
    sortedRecipes(recipes.filter((recipe) => recipe.data.lang === lang && (recipe.data.tags || []).includes(tag)))
  );
  config.addFilter("recipesByCategory", (recipes, lang, category) =>
    sortedRecipes(recipes.filter((recipe) => recipe.data.lang === lang && recipe.data.category === category))
  );
  config.addFilter("ingredientNames", (ingredients = []) =>
    ingredients.map((item) => item.name).filter(Boolean)
  );
  config.addFilter("mediaTitles", (mediaEmbeds = []) =>
    mediaEmbeds.map((embed) => embed.title).filter(Boolean)
  );
  config.addFilter("absoluteUrl", (path, site) => {
    const base = site?.url || "https://example.com";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    const normalizedPath = String(path || "").replace(/^\/+/, "");
    return new URL(normalizedPath, normalizedBase).toString();
  });
  config.addFilter("safeJsonLdImage", (key, site) => {
    const image = imageRegistry[key];
    if (!image || image.startsWith("data:")) return "";
    return new URL(image, site?.url || "https://example.com").toString();
  });

  config.addCollection("recipes", (collectionApi) =>
    sortedRecipes(collectionApi.getFilteredByGlob("src/content/recipes/**/*.md").map(normalizeRecipe))
  );

  config.addCollection("recipeTagPages", (collectionApi) => {
    const recipes = sortedRecipes(collectionApi.getFilteredByGlob("src/content/recipes/**/*.md").map(normalizeRecipe));
    const pages = [];
    const langTags = new Map();

    for (const recipe of recipes) {
      const lang = recipe.data.lang;
      if (!langTags.has(lang)) langTags.set(lang, new Map());
      for (const tag of recipe.data.tags || []) {
        langTags.get(lang).set(tag, (langTags.get(lang).get(tag) || 0) + 1);
      }
    }

    for (const [lang, tagMap] of langTags.entries()) {
      for (const [tag, count] of tagMap.entries()) {
        const prefix = lang === DEFAULT_LANGUAGE ? "" : `${lang}/`;
        pages.push({
          lang,
          tag,
          count,
          url: `/${prefix}tags/${encodeURIComponent(tag)}/`,
          permalink: `${prefix}tags/${encodeURIComponent(tag)}/index.html`
        });
      }
    }

    return pages.sort((a, b) => a.lang.localeCompare(b.lang) || a.tag.localeCompare(b.tag));
  });

  config.addCollection("recipeListPages", (collectionApi) => {
    const recipes = sortedRecipes(collectionApi.getFilteredByGlob("src/content/recipes/**/*.md").map(normalizeRecipe));
    const languages = [...new Set(recipes.map((recipe) => recipe.data.lang))];
    const pages = [];

    for (const lang of languages) {
      const langRecipes = sortedRecipes(recipes.filter((recipe) => recipe.data.lang === lang));
      const totalPages = Math.max(1, Math.ceil(langRecipes.length / PAGE_SIZE));
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const prefix = lang === DEFAULT_LANGUAGE ? "" : `${lang}/`;
        pages.push({
          lang,
          pageNumber,
          totalPages,
          recipes: langRecipes.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE),
          permalink: pageNumber === 1 ? `${prefix}recipes/index.html` : `${prefix}recipes/page/${pageNumber}/index.html`,
          url: pageNumber === 1 ? `/${prefix}recipes/` : `/${prefix}recipes/page/${pageNumber}/`
        });
      }
    }

    return pages;
  });

  config.addCollection("recipeCategoryPages", (collectionApi) => {
    const recipes = sortedRecipes(collectionApi.getFilteredByGlob("src/content/recipes/**/*.md").map(normalizeRecipe));
    const languages = [...new Set(recipes.map((recipe) => recipe.data.lang))];
    return languages.flatMap((lang) =>
      [...VALID_CATEGORIES].map((category) => {
        const prefix = lang === DEFAULT_LANGUAGE ? "" : `${lang}/`;
        return {
          lang,
          category,
          recipes: sortedRecipes(recipes.filter((recipe) => recipe.data.lang === lang && recipe.data.category === category)),
          permalink: `${prefix}categories/${category}/index.html`,
          url: `/${prefix}categories/${category}/`
        };
      })
    );
  });

  config.amendLibrary("md", (markdown) => {
    const defaultFence =
      markdown.renderer.rules.fence ||
      ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

    markdown.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      if (token.info.trim() === "mermaid") {
        return `<pre class="mermaid">${escapeHtml(token.content)}</pre>`;
      }
      return defaultFence(tokens, idx, options, env, self);
    };
  });

  return {
    pathPrefix: process.env.BASE_PATH || "/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
}
