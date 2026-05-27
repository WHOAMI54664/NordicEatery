import type { MetadataRoute } from "next";

const baseUrl = "https://www.nordiceatery.se";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/admin/",
                    "/sv/admin/",
                    "/en/admin/",
                    "/pl/admin/",
                    "/ru/admin/",
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}