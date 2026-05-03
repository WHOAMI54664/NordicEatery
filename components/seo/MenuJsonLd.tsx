type MenuJsonLdProduct = {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    image_url?: string | null;
    category?: string | null;
};

type MenuJsonLdProps = {
    products: MenuJsonLdProduct[];
    locale: string;
};

const baseUrl = "https://www.nordiceatery.se";

export function MenuJsonLd({ products, locale }: MenuJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        name: "Nordic Eatery",
        url: `${baseUrl}/${locale}/menu`,
        image: `${baseUrl}/og-image.jpg`,
        servesCuisine: ["Polish food", "Street food", "Burgers"],
        priceRange: "$$",
        address: {
            "@type": "PostalAddress",
            addressLocality: "Boden",
            addressCountry: "SE",
        },
        areaServed: {
            "@type": "City",
            name: "Boden",
        },
        hasMenu: {
            "@type": "Menu",
            name: "Nordic Eatery Menu",
            url: `${baseUrl}/${locale}/menu`,
            hasMenuSection: [
                {
                    "@type": "MenuSection",
                    name: "Popular menu items",
                    hasMenuItem: products.slice(0, 12).map((product) => ({
                        "@type": "MenuItem",
                        name: product.name,
                        description: product.description || undefined,
                        image: product.image_url || undefined,
                        offers: {
                            "@type": "Offer",
                            price: product.price,
                            priceCurrency: "SEK",
                            availability: "https://schema.org/InStock",
                            url: `${baseUrl}/${locale}/menu`,
                        },
                    })),
                },
            ],
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
        />
    );
}