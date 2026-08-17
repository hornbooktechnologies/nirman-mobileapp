import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { UpsertProjectMemberDto } from './upsert-project-member.dto';

export class ProjectMemberBatchAssignmentDto extends UpsertProjectMemberDto {
  @IsUUID()
  memberId!: string;
}

export class SaveProjectMemberAssignmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberBatchAssignmentDto)
  assignments!: ProjectMemberBatchAssignmentDto[];

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  unassignMemberIds!: string[];
}
