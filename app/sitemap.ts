import type { MetadataRoute } from "next";

const baseUrl = "https://www.nordiceatery.se";

const locales = ["sv", "en", "pl", "ru"] as const;

const pages = [
    {
        path: "",
        changeFrequency: "daily",
        priority: 1,
    },
    {
        path: "menu",
        changeFrequency: "daily",
        priority: 0.9,
    },
    {
        path: "delivery-boden",
        changeFrequency: "weekly",
        priority: 0.9,
    },
    {
        path: "takeaway-boden",
        changeFrequency: "weekly",
        priority: 0.85,
    },
    {
        path: "polish-food-boden",
        changeFrequency: "weekly",
        priority: 0.9,
    },
    {
        path: "catering-boden",
        changeFrequency: "weekly",
        priority: 0.85,
    },
    {
        path: "booking",
        changeFrequency: "weekly",
        priority: 0.75,
    },
    {
        path: "contact",
        changeFrequency: "monthly",
        priority: 0.6,
    },
    {
        path: "about",
        changeFrequency: "monthly",
        priority: 0.55,
    },
    {
        path: "support",
        changeFrequency: "monthly",
        priority: 0.5,
    },
] satisfies Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
}>;

function buildLocalizedUrl(locale: (typeof locales)[number], path: string) {
    return path
        ? `${baseUrl}/${locale}/${path}`
        : `${baseUrl}/${locale}`;
}

function buildLanguageAlternates(path: string) {
    return {
        "sv-SE": buildLocalizedUrl("sv", path),
        "en-SE": buildLocalizedUrl("en", path),
        "pl-PL": buildLocalizedUrl("pl", path),
        "ru-RU": buildLocalizedUrl("ru", path),
        "x-default": buildLocalizedUrl("sv", path),
    };
}

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    return locales.flatMap((locale) =>
        pages.map((page) => ({
            url: buildLocalizedUrl(locale, page.path),
            lastModified,
            changeFrequency: page.changeFrequency,
            priority: page.priority,
            alternates: {
                languages: buildLanguageAlternates(page.path),
            },
        }))
    );
}