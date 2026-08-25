import {
  WORKER_SORT_KEYS,
  WORKER_STATUSES,
  type WorkerSortKey,
  type WorkerStatus,
} from "@nirman-app/shared";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class QueryWorkerDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(WORKER_STATUSES)
  status?: WorkerStatus;

  @IsOptional()
  @IsString()
  trade?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsIn(["CURRENT", "ALL_ACTIVE"])
  assignmentScope?: "CURRENT" | "ALL_ACTIVE" = "CURRENT";

  @IsOptional()
  @IsIn(WORKER_SORT_KEYS)
  sortBy?: WorkerSortKey = "created_at";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
