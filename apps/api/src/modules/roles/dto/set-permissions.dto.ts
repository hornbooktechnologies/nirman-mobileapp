import { IsArray, IsIn, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PERMISSION_ACTIONS, PERMISSION_RESOURCES } from '@nirman-app/shared';

export class PermissionItemDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(PERMISSION_RESOURCES)
  resource!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(PERMISSION_ACTIONS)
  action!: string;
}

export class SetPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions!: PermissionItemDto[];
}
