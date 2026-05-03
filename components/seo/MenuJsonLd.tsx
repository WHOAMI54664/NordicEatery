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
    const menuItems = products
        .filter((product) => product.name && product.price)
        .slice(0, 24)
        .map((product) => ({
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
        }));

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Restaurant",

        name: "Nordic Eatery",
        url: `${baseUrl}/${locale}/menu`,
        image: `${baseUrl}/og-image.jpg`,

        // Замени на реальный номер бизнеса
        telephone: "+46734218925",

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

        openingHoursSpecification: [
            {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                ],
                opens: "11:00",
                closes: "21:00",
            },
        ],

        sameAs: [
            "https://www.instagram.com/mikesfry?igsh=Z2E5ZjYxNGNwZWRw",
            "https://www.facebook.com/share/18ekHzPAEV/?mibextid=wwXIfr"
        ],

        hasMenu: {
            "@type": "Menu",
            name: "Nordic Eatery Menu",
            url: `${baseUrl}/${locale}/menu`,
            hasMenuSection: [
                {
                    "@type": "MenuSection",
                    name: "Menu items",
                    hasMenuItem: menuItems,
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