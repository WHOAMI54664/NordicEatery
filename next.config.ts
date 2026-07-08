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
    "/api/admin/reports/online-sales/pdf": [
      "./node_modules/pdfkit/js/data/*.afm",
    ],
  },

  async redirects() {
    return [
      {
        source: "/burgers-boden",
        destination: "/en/polish-food-boden",
        permanent: true,
      },
      {
        source: "/:locale(en|sv|pl|ru)/burgers-boden",
        destination: "/:locale/polish-food-boden",
        permanent: true,
      },
    ];
  },

};

export default withNextIntl(nextConfig);