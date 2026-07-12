function languageFromPath(inputPath = "") {
  const match = inputPath.match(/[\\/]recipes[\\/]([^\\/]+)[\\/]/);
  return match ? match[1] : "ta";
}

export default {
  layout: "layouts/recipe.njk",
  tags: "recipe",
  eleventyComputed: {
    lang: (data) => languageFromPath(data.page.inputPath),
    translationId: (data) => data.translationKey || data.page.fileSlug,
    recipeSlug: (data) => data.slug || data.page.fileSlug,
    permalink: (data) => {
      const lang = languageFromPath(data.page.inputPath);
      const prefix = lang === "ta" ? "" : `${lang}/`;
      return `${prefix}recipes/${data.slug || data.page.fileSlug}/index.html`;
    }
  }
};
