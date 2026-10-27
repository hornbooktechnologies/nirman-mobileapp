import { getLocalizedErrorMessage } from "../i18n";
import { ApiRequestError } from "./api";

/** Include the server's actionable message without exposing headers, tokens or stack traces. */
export function uploadErrorMessage(error: unknown, fallback: string) {
  const localized = getLocalizedErrorMessage(error, fallback);
  const detail = error instanceof Error ? error.message.slice(0, 500) : "";
  const status =
    error instanceof ApiRequestError
      ? `HTTP ${error.status}${error.code ? ` · ${error.code}` : ""}`
      : "";
  return [localized, detail && detail !== localized ? detail : "", status]
    .filter(Boolean)
    .join("\n\n");
}
