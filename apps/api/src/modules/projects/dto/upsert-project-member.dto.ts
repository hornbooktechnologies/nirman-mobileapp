import {
  PROJECT_DELEGATABLE_PERMISSIONS,
  PROJECT_MEMBER_STATUSES,
  PROJECT_PERMISSION_MODES,
  type PermissionKey,
  type ProjectMemberStatus,
  type ProjectPermissionMode,
} from '@nirman-app/shared';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertProjectMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleLabel?: string | null;

  @IsOptional()
  @IsIn(PROJECT_PERMISSION_MODES)
  permissionMode?: ProjectPermissionMode = 'ROLE_DEFAULT';

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(PROJECT_DELEGATABLE_PERMISSIONS, { each: true })
  permissions?: PermissionKey[] = [];

  @IsOptional()
  @IsIn(PROJECT_MEMBER_STATUSES)
  status?: ProjectMemberStatus = 'ACTIVE';

  @IsOptional()
  @IsDateString()
  startsOn?: string | null;

  @IsOptional()
  @IsDateString()
  endsOn?: string | null;
}
