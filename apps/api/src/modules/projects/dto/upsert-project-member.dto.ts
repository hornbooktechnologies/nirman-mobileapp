import {
  PROJECT_MEMBER_STATUSES,
  type ProjectMemberStatus,
} from '@nirman-app/shared';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertProjectMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleLabel?: string | null;

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
