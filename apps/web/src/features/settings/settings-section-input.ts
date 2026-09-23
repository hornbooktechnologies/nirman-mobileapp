import type { EmailSettings, GeneralSettings, UpdateSettingsInput } from "./types/settings.types";

export function settingsSectionInput(
  section: "general" | "email",
  general: Record<keyof GeneralSettings, string>,
  email: Record<keyof EmailSettings, string>,
): UpdateSettingsInput {
  return section === "general"
    ? { general, email: {} }
    : { general: {}, email };
}
