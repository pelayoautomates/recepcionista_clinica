import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

const privatePaths = [
  "/api/",
  "/auth/",
  "/login",
  "/panel",
  "/panel/",
  "/agencia",
  "/agencia/",
  "/onboarding",
  "/onboarding/",
  "/suscripcion",
  "/suscripcion/",
  "/_next/",
];

export default function robots(): MetadataRoute.Robots {
  const rule = {
    allow: "/",
    disallow: privatePaths,
  };

  return {
    rules: [
      {
        userAgent: "Googlebot",
        ...rule,
      },
      {
        userAgent: "OAI-SearchBot",
        ...rule,
      },
      {
        userAgent: "*",
        ...rule,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
