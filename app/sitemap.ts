import type { MetadataRoute } from "next";

const baseUrl = "https://www.nordiceatery.se";

const locales = ["en", "sv", "pl", "ru"] as const;

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

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    const localizedPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
        pages.map((page) => ({
            url: page.path
                ? `${baseUrl}/${locale}/${page.path}`
                : `${baseUrl}/${locale}`,
            lastModified,
            changeFrequency: page.changeFrequency,
            priority: page.priority,
        }))
    );

    return [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: "daily",
            priority: 1,
        },
        ...localizedPages,
    ];
}