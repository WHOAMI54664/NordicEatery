import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    qualities: [70, 75, 80, 85, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  serverExternalPackages: ["pdfkit"],

  outputFileTracingIncludes: {
    "/api/orders/*/receipt": ["./node_modules/pdfkit/js/data/*.afm"],
    "/api/orders/send-receipt": ["./node_modules/pdfkit/js/data/*.afm"],
    "/api/group-orders/*/receipt": ["./node_modules/pdfkit/js/data/*.afm"],
    "/api/admin/reports/online-sales/pdf": [
      "./node_modules/pdfkit/js/data/*.afm",
    ],
  },

  async redirects() {
    return [
      {
        source: "/burgers-boden",
        destination: "/en/streetfood-i-norrbotten",
        permanent: true,
      },
      {
        source: "/:locale(en|sv|pl|ru)/burgers-boden",
        destination: "/:locale/streetfood-i-norrbotten",
        permanent: true,
      },
      {
        source: "/polish-food-boden",
        destination: "/streetfood-i-norrbotten",
        permanent: true,
      },
      {
        source: "/:locale(en|sv|pl|ru)/polish-food-boden",
        destination: "/:locale/streetfood-i-norrbotten",
        permanent: true,
      },
      {
        source: "/delivery-boden",
        destination: "/bestall-takeaway",
        permanent: true,
      },
      {
        source: "/:locale(en|sv|pl|ru)/delivery-boden",
        destination: "/:locale/bestall-takeaway",
        permanent: true,
      },
      {
        source: "/takeaway-boden",
        destination: "/bestall-takeaway",
        permanent: true,
      },
      {
        source: "/:locale(en|sv|pl|ru)/takeaway-boden",
        destination: "/:locale/bestall-takeaway",
        permanent: true,
      },
      { source: "/catering-boden", destination: "/catering", permanent: true },
      {
        source: "/:locale(en|sv|pl|ru)/catering-boden",
        destination: "/:locale/catering",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
