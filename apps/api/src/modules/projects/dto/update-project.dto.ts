import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectStatus,
  type ProjectType,
} from '@nirman-app/shared';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ProjectAddressDto } from './project-address.dto';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  projectCode?: string | null;

  @IsOptional()
  @IsIn(PROJECT_TYPES)
  type?: ProjectType;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectAddressDto)
  address?: ProjectAddressDto;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;
}
