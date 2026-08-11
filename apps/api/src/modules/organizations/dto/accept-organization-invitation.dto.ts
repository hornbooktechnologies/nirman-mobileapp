import { IsOptional, IsString, MinLength } from "class-validator";

export class AcceptOrganizationInvitationDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
