import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atiende360.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicPages = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/demo", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/piloto-clinicas-esteticas", changeFrequency: "weekly" as const, priority: 0.95 },
    { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/blog", changeFrequency: "weekly" as const, priority: 0.85 },
    { path: "/seguridad", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/integraciones", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/sobre-atiende360", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/comparativa/chatbot-generico", changeFrequency: "monthly" as const, priority: 0.65 },
  ];

  const staticUrls = publicPages.map((page) => ({
    url: `${siteUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const blogUrls = BLOG_POSTS.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...staticUrls, ...blogUrls];
}
