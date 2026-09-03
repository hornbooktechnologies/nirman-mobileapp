import { IsIn, IsString, Matches, MaxLength } from "class-validator";
import {
  NOTIFICATION_SUPPORTED_LOCALES,
  PUSH_DEVICE_PLATFORMS,
  type NotificationLocale,
  type PushDevicePlatform,
} from "@nirman-app/shared";

export class RegisterPushDeviceDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/)
  expoPushToken!: string;

  @IsIn(PUSH_DEVICE_PLATFORMS)
  platform!: PushDevicePlatform;

  @IsIn(NOTIFICATION_SUPPORTED_LOCALES)
  locale!: NotificationLocale;
}
