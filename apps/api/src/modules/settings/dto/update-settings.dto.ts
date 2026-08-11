import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateGeneralDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  appName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lightLogo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  darkLogo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  favicon?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyAddress?: string;
}

export class UpdateEmailSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  smtpHost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  smtpPort?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  smtpUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  smtpPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  smtpEncryption?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsEmail()
  mailFromAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mailFromName?: string;
}
