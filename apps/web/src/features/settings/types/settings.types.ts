export interface GeneralSettings {
  appName: string | null;
  companyName: string | null;
  lightLogo: string | null;
  darkLogo: string | null;
  favicon: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  companyAddress: string | null;
}

export interface EmailSettings {
  smtpHost: string | null;
  smtpPort: string | null;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpEncryption: string | null;
  mailFromAddress: string | null;
  mailFromName: string | null;
}

export interface SettingsResponse {
  general: GeneralSettings;
  email: EmailSettings;
}

export type UpdateGeneralSettingsInput = Partial<Record<keyof GeneralSettings, string>>;

export type UpdateEmailSettingsInput = Partial<Record<keyof EmailSettings, string>>;

export interface UpdateSettingsInput {
  general: UpdateGeneralSettingsInput;
  email: UpdateEmailSettingsInput;
}
