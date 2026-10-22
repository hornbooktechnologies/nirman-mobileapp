function parseStrictOrigin(value: string | undefined | null) {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.origin === 'null' || parsed.pathname !== '/' || parsed.search || parsed.hash) return null
    return parsed.origin
  } catch {
    return null
  }
}

export function isAllowedContactOrigin(
  requestUrl: string,
  originHeader: string | null,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL,
) {
  const submittedOrigin = parseStrictOrigin(originHeader)
  if (!submittedOrigin) return false

  const requestOrigin = new URL(requestUrl).origin
  const configuredOrigin = parseStrictOrigin(configuredSiteUrl)
  return submittedOrigin === requestOrigin || submittedOrigin === configuredOrigin
}
