# RecipeAtlas

RecipeAtlas is a production-ready multilingual recipe website built with Eleventy, JavaScript ES modules, plain CSS, and minimal dependencies.

Tamil is the default language. English is included as a second language, and more languages can be added by creating another recipe folder.

## Install

```sh
npm install
```

## Develop

```sh
npm run dev
```

## Build

```sh
npm run build
```

The generated static site is written to `_site/`.

## Deploy

The included GitHub Actions workflow deploys to GitHub Pages. It supports both `username.github.io` and repository pages such as `username.github.io/recipe-atlas`.

For local builds with a repository base path:

```sh
BASE_PATH=/recipe-atlas/ SITE_URL=https://username.github.io/recipe-atlas/ npm run build
```

## Folder Structure

```text
src/
  content/
    recipes/
      ta/
      en/
  data/
    images/
      registry.js
      biryani.js
      idli.js
  _data/
  _includes/
    layouts/
    components/
  assets/
    css/
    js/
```

## Recipe Frontmatter

Only `title`, `category`, and `ingredients` are required.

```yaml
---
title:
translationKey:
slug:
summary:
category:
tags:
featured:
published:
updated:
difficulty:
servings:
prepTime:
cookTime:
totalTime:
cover:
ingredients:
nutrition:
mediaEmbeds:
---
```

Allowed categories are `veg` and `non-veg`.

## Translation

Language is derived from the folder name:

```text
src/content/recipes/ta/idli.md
src/content/recipes/en/idli.md
```

Do not put language in frontmatter. Use `translationKey` to connect translated recipes. If `translationKey` is missing, RecipeAtlas uses the filename.

Tamil recipe URLs are the default:

```text
/recipes/idli/
```

English recipe URLs are language-prefixed:

```text
/en/recipes/idli/
```

The language selector remembers the chosen language in `localStorage`. On recipe pages, it navigates to the matching translation when available; otherwise it stays on the available recipe and displays a small notice.

## Ingredients

Ingredients stay in YAML and preserve order.

```yaml
ingredients:
  - group: Batter
    name: Rice
    quantity: 2
    unit: cup
  - group: Batter
    name: Salt
    note: As required
```

Recipe pages include ingredient scaling, shopping checklist checkboxes, copy, print, and ingredient search.

## Images

Images are JavaScript constants in `src/data/images/`. Markdown and frontmatter reference keys only:

```yaml
cover: IDLI
```

Inline recipe images use the shortcode:

```njk
{% recipeImage "BIRYANI_STEP1" %}
{% recipeImage "BIRYANI_STEP1", "Onions" %}
{% recipeImage "BIRYANI_STEP1", "Onions", "Slice onions lengthwise." %}
```

Invalid image keys emit build warnings.

## Media Embeds

Supported providers:

- `youtube`
- `youtube-short`
- `instagram`

```yaml
mediaEmbeds:
  - type: youtube
    id: K6o9JTcPgOA
    title: Tutorial
    startTime: 85
```

YouTube embeds use the `youtube-nocookie.com` domain. Embeds lazy-load with IntersectionObserver.

## Mermaid

Use fenced Mermaid blocks in Markdown:

````md
```mermaid
flowchart TD
  A --> B
```
````

The Mermaid loader is included only on pages that contain Mermaid diagrams.

## Search

Eleventy generates `/search-index.json` with recipe metadata, tags, ingredient names, media titles, excerpts, and body text. It excludes Base64 images and iframe HTML.

Client-side search supports:

- title
- tags
- ingredients
- summary
- body
- veg and non-veg filters
- language filter
- debounced input
- keyboard navigation
- highlighted matches
- query string persistence

## Pagination

Recipe list pages are generated from the configured page size in `.eleventy.js`. Tag and category pages are generated automatically from recipe data.

## Add a New Language

1. Add a language entry in `src/_data/languages.js`.
2. Create a folder under `src/content/recipes/`, such as `hi/`.
3. Add recipe Markdown files.
4. Use the same `translationKey` as other translations when applicable.

## Add a New Recipe

1. Create a Markdown file in the desired language folder.
2. Add required frontmatter: `title`, `category`, `ingredients`.
3. Add optional metadata, tags, cover key, media embeds, and Markdown body content.
4. Keep ingredients in YAML, not in the Markdown body.

## SEO

RecipeAtlas generates:

- `sitemap.xml`
- `robots.txt`
- Atom feed at `feed.xml`
- canonical links
- hreflang links
- OpenGraph and Twitter metadata
- Recipe JSON-LD
- Breadcrumb JSON-LD

Data URI images are intentionally excluded from JSON-LD image fields.
