import localFont from "next/font/local";

export const lufga = localFont({
    src: [
        {
            path: "./fonts/Lufga/Lufga-Regular.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "./fonts/Lufga/Lufga-Medium.woff2",
            weight: "500",
            style: "normal",
        },
        {
            path: "./fonts/Lufga/Lufga-SemiBold.woff2",
            weight: "600",
            style: "normal",
        },
        {
            path: "./fonts/Lufga/Lufga-Bold.woff2",
            weight: "700",
            style: "normal",
        }
    ],
    variable: "--font-lufga",
    display: "swap",
});