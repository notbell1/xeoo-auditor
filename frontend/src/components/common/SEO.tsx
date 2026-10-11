import React, { useEffect } from "react";
import { siteConfig, getCanonicalUrl } from "../../config/site";

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
  twitterCard?: "summary" | "summary_large_image";
}

function setOrCreateMeta(selector: string, attr: "name" | "property", attrValue: string, content: string) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setOrCreateLink(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = siteConfig.defaultDescription,
  canonicalPath = "/",
  ogType = "website",
  ogImage = siteConfig.ogImage,
  noindex = false,
  twitterCard = "summary_large_image",
}) => {
  useEffect(() => {
    // 1. Document Title
    const fullTitle = title
      ? `${title} | ${siteConfig.name}`
      : siteConfig.defaultTitle;
    document.title = fullTitle;

    // 2. Meta Description
    setOrCreateMeta('meta[name="description"]', "name", "description", description);

    // 3. Robots directive
    const robotsContent = noindex ? "noindex, nofollow" : "index, follow";
    setOrCreateMeta('meta[name="robots"]', "name", "robots", robotsContent);

    // 4. Canonical URL
    const canonicalUrl = getCanonicalUrl(canonicalPath);
    setOrCreateLink("canonical", canonicalUrl);

    // 5. Open Graph Metadata
    setOrCreateMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setOrCreateMeta('meta[property="og:description"]', "property", "og:description", description);
    setOrCreateMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setOrCreateMeta('meta[property="og:type"]', "property", "og:type", ogType);
    setOrCreateMeta('meta[property="og:site_name"]', "property", "og:site_name", siteConfig.name);

    const fullImageUrl = ogImage.startsWith("http")
      ? ogImage
      : `${siteConfig.baseUrl}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`;
    setOrCreateMeta('meta[property="og:image"]', "property", "og:image", fullImageUrl);

    // 6. Twitter / X Card
    setOrCreateMeta('meta[name="twitter:card"]', "name", "twitter:card", twitterCard);
    setOrCreateMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setOrCreateMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setOrCreateMeta('meta[name="twitter:image"]', "name", "twitter:image", fullImageUrl);

    return () => {
      // Revert title to default when navigating away
      document.title = siteConfig.defaultTitle;
    };
  }, [title, description, canonicalPath, ogType, ogImage, noindex, twitterCard]);

  return null;
};

