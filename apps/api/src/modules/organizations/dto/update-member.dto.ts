import {
  ORGANIZATION_MEMBER_STATUSES,
  type OrganizationMemberStatus,
} from '@nirman-app/shared';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsIn(ORGANIZATION_MEMBER_STATUSES)
  status?: OrganizationMemberStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @IsOptional()
  @IsBoolean()
  organizationWideProjectAccess?: boolean;
}
