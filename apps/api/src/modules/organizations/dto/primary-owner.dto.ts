import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class PrimaryOwnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsEmail()
  @MaxLength(190)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim())
  mobile!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  designation?: string;
}
