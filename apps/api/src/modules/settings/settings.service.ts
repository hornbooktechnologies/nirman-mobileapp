import { Injectable } from '@nestjs/common';
import {
  UpdateEmailSettingsDto,
  UpdateGeneralDto,
} from './dto/update-settings.dto';
import { SETTING_KEYS, SettingKey, SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  getAll() {
    return this.settingsRepo.getAll();
  }

  async updateGeneral(dto: UpdateGeneralDto, actorId: string) {
    await this.settingsRepo.upsertMany(
      this.toEntries({
        [SETTING_KEYS.APP_NAME]: dto.appName,
        [SETTING_KEYS.COMPANY_NAME]: dto.companyName,
        [SETTING_KEYS.LIGHT_LOGO]: dto.lightLogo,
        [SETTING_KEYS.DARK_LOGO]: dto.darkLogo,
        [SETTING_KEYS.FAVICON]: dto.favicon,
        [SETTING_KEYS.SUPPORT_EMAIL]: dto.supportEmail,
        [SETTING_KEYS.SUPPORT_PHONE]: dto.supportPhone,
        [SETTING_KEYS.COMPANY_ADDRESS]: dto.companyAddress,
      }),
      actorId,
    );
    return this.getAll();
  }

  async updateEmail(dto: UpdateEmailSettingsDto, actorId: string) {
    await this.settingsRepo.upsertMany(
      this.toEntries({
        [SETTING_KEYS.SMTP_HOST]: dto.smtpHost,
        [SETTING_KEYS.SMTP_PORT]: dto.smtpPort,
        [SETTING_KEYS.SMTP_USERNAME]: dto.smtpUsername,
        [SETTING_KEYS.SMTP_PASSWORD]: dto.smtpPassword,
        [SETTING_KEYS.SMTP_ENCRYPTION]: dto.smtpEncryption,
        [SETTING_KEYS.MAIL_FROM_ADDRESS]: dto.mailFromAddress,
        [SETTING_KEYS.MAIL_FROM_NAME]: dto.mailFromName,
      }),
      actorId,
    );
    return this.getAll();
  }

  private toEntries(values: Partial<Record<SettingKey, string | undefined>>) {
    return Object.entries(values)
      .filter((entry): entry is [SettingKey, string] => entry[1] !== undefined)
      .map(([key, value]) => ({ key, value }));
  }
}
