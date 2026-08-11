import { api } from "@/lib/api/api-client";
import type {
  SettingsResponse,
  UpdateEmailSettingsInput,
  UpdateGeneralSettingsInput,
  UpdateSettingsInput,
} from "@/features/settings/types/settings.types";

export const settingsService = {
  getSettings() {
    return api.get<SettingsResponse>("/settings");
  },
  updateGeneralSettings(input: UpdateGeneralSettingsInput) {
    return api.patch<SettingsResponse, UpdateGeneralSettingsInput>("/settings/general", input);
  },
  updateEmailSettings(input: UpdateEmailSettingsInput) {
    return api.patch<SettingsResponse, UpdateEmailSettingsInput>("/settings/email", input);
  },
  async updateSettings(input: UpdateSettingsInput) {
    let response: SettingsResponse | null = null;
    if (Object.keys(input.general).length > 0) {
      response = await settingsService.updateGeneralSettings(input.general);
    }
    if (Object.keys(input.email).length > 0) {
      response = await settingsService.updateEmailSettings(input.email);
    }
    return response ?? settingsService.getSettings();
  },
};
