import type { MetadataRoute } from "next";

// /admin and the 2FA pages must never be indexed; the customer account
// pages are auth-gated anyway but excluding them keeps crawlers from
// hammering redirect loops.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/login/2fa", "/requests", "/request", "/notifications"],
    },
  };
}
