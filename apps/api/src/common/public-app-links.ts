/** Public account links must never inherit a legacy production host. */
export function publicWebOrigin(activation = false) {
  const productionOrigin = "https://app.nirmansite.com";
  if (process.env.NODE_ENV === "production") return productionOrigin;
  const configured =
    (activation ? process.env.PUBLIC_ACTIVATION_WEB_URL : undefined)?.trim() ||
    process.env.PUBLIC_WEB_APP_URL?.trim();
  if (!configured) return productionOrigin;
  try {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol)) return productionOrigin;
    if (
      url.hostname === "nirman-mobileapp-web.vercel.app" ||
      url.hostname === "nirman-website.vercel.app"
    )
      return productionOrigin;
    return url.origin;
  } catch {
    return productionOrigin;
  }
}

export function publicAccountLink(
  screen: "activate" | "reset-password",
  token: string,
) {
  const url = new URL(`/${screen}`, publicWebOrigin(screen === "activate"));
  url.searchParams.set("token", token);
  return url.href;
}

export function mobileAccountLink(
  screen: "activate" | "reset-password",
  token: string,
) {
  const expoUrl = process.env.EXPO_GO_PROJECT_URL?.trim();
  if (expoUrl && process.env.NODE_ENV !== "production") {
    return `${expoUrl.replace(/\/$/, "")}/--/${screen}?token=${encodeURIComponent(token)}`;
  }
  const url = new URL("/open-app", publicWebOrigin());
  url.searchParams.set("screen", screen);
  url.searchParams.set("token", token);
  return url.href;
}
