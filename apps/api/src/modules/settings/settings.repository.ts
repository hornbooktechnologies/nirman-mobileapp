import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DbRow } from '../../database/database.types';

export const SETTING_KEYS = {
  APP_NAME: 'general.appName',
  COMPANY_NAME: 'general.companyName',
  LIGHT_LOGO: 'general.lightLogo',
  DARK_LOGO: 'general.darkLogo',
  FAVICON: 'general.favicon',
  SUPPORT_EMAIL: 'general.supportEmail',
  SUPPORT_PHONE: 'general.supportPhone',
  COMPANY_ADDRESS: 'general.companyAddress',
  SMTP_HOST: 'email.smtpHost',
  SMTP_PORT: 'email.smtpPort',
  SMTP_USERNAME: 'email.smtpUsername',
  SMTP_PASSWORD: 'email.smtpPassword',
  SMTP_ENCRYPTION: 'email.smtpEncryption',
  MAIL_FROM_ADDRESS: 'email.mailFromAddress',
  MAIL_FROM_NAME: 'email.mailFromName',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

interface SettingRow extends DbRow {
  key: string;
  value: string;
}

@Injectable()
export class SettingsRepository {
  constructor(private readonly database: DatabaseService) {}

  async getAll() {
    const rows = await this.database.query<SettingRow>(
      'SELECT `key`, value FROM systemsetting',
    );
    const map = new Map(rows.map((row) => [row.key, row.value]));

    return {
      general: {
        appName: map.get(SETTING_KEYS.APP_NAME) ?? null,
        companyName: map.get(SETTING_KEYS.COMPANY_NAME) ?? null,
        lightLogo: map.get(SETTING_KEYS.LIGHT_LOGO) ?? null,
        darkLogo: map.get(SETTING_KEYS.DARK_LOGO) ?? null,
        favicon: map.get(SETTING_KEYS.FAVICON) ?? null,
        supportEmail: map.get(SETTING_KEYS.SUPPORT_EMAIL) ?? null,
        supportPhone: map.get(SETTING_KEYS.SUPPORT_PHONE) ?? null,
        companyAddress: map.get(SETTING_KEYS.COMPANY_ADDRESS) ?? null,
      },
      email: {
        smtpHost: map.get(SETTING_KEYS.SMTP_HOST) ?? null,
        smtpPort: map.get(SETTING_KEYS.SMTP_PORT) ?? null,
        smtpUsername: map.get(SETTING_KEYS.SMTP_USERNAME) ?? null,
        smtpPassword: map.get(SETTING_KEYS.SMTP_PASSWORD) ?? null,
        smtpEncryption: map.get(SETTING_KEYS.SMTP_ENCRYPTION) ?? null,
        mailFromAddress: map.get(SETTING_KEYS.MAIL_FROM_ADDRESS) ?? null,
        mailFromName: map.get(SETTING_KEYS.MAIL_FROM_NAME) ?? null,
      },
    };
  }

  async upsertMany(entries: { key: SettingKey; value: string }[], updatedBy: string) {
    await this.database.transaction(async (connection) => {
      for (const { key, value } of entries) {
        await this.database.execute(
          `INSERT INTO systemsetting (\`key\`, value, updatedAt, updatedBy)
          VALUES (?, ?, CURRENT_TIMESTAMP(3), ?)
          ON DUPLICATE KEY UPDATE
            value = VALUES(value),
            updatedAt = CURRENT_TIMESTAMP(3),
            updatedBy = VALUES(updatedBy)`,
          [key, value, updatedBy],
          connection,
        );
      }
    });
  }
}
