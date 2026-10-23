/** The configured marketing origin, independent of proxy/container addresses. */
export function contactWebsiteOrigin() {
  return new URL(
    process.env.WEBSITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://nirmansite.com"
        : "http://localhost:3001"),
  ).origin;
}
