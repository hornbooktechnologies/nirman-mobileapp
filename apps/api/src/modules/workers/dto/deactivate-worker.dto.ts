import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeactivateWorkerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
