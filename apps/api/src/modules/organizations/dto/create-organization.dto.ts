import {
  OPERATING_PROFILES,
  ORGANIZATION_TYPES,
  type OperatingProfile,
  type OrganizationType,
} from '@nirman-app/shared';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PrimaryOwnerDto } from './primary-owner.dto';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsIn(ORGANIZATION_TYPES)
  type!: OrganizationType;

  @IsOptional()
  @IsIn(OPERATING_PROFILES)
  operatingProfile?: OperatingProfile = 'CUSTOM';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string = 'Asia/Kolkata';

  @IsOptional()
  @IsIn(['INR'])
  currency?: string = 'INR';

  @IsDefined()
  @ValidateNested()
  @Type(() => PrimaryOwnerDto)
  owner!: PrimaryOwnerDto;
}
