import { MISC } from "@/config";

export const languages = {
  en: "EN"
};

export const defaultLang = "en";

export const ui = {
  en: {
    "nav.home": "Home",
    "nav.tags": "Tags",
    "nav.tags.description": "Here is the tag index of this site, where you can browse and quickly find posts and content related to topics you are interested in.",
    "nav.about": "About",
    "search.placeholder.firstPart": "Search in ",
    "search.placeholder.secondPart.post": " posts...",
    "search.placeholder.secondPart.tag": " tags...",
    "search.noResults": "No results found",
    "postsWithTag.firstPart": "Posts with tag",
    "postsWithTag.secondPart": "",
    "postsWithTag.description.firstPart": "Here are all posts with tag",
    "postsWithTag.description.secondPart": ".",
    toc: "Table of Content",
    pageNotFound: "PAGE NOT FOUND",
    pageNotFoundDescription: "Sorry, the page you are looking for does not exist. Please check the URL or go back to the homepage.",
    goBackHome: "Go Back Home",
    publishedAt: "Published at",
    updatedAt: "Updated at",
    "post.newlyUpdatedMsg": `Updated in ${MISC.dateTag.daysToBeGreen} days`,
    "post.oldPostWarningMsg": `Last update over ${MISC.dateTag.daysToBeRed} days ago`,
    "post.license": "Licensed under",
  }
};

export type Lang = keyof typeof languages;

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: string = lang) {
    return l === defaultLang ? path : `/${l}${path}`;
  };
}

export function getLangFromUrl(url: string): [Lang, string] {
  const [, lang] = url.split("/");
  if (lang in languages) return [lang as Lang, url.slice(lang.length + 1)];
  return [defaultLang, url];
}

export function useTranslations(lang: Lang) {
  return function t(key: keyof typeof ui.en) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
