import { Injectable } from "@nestjs/common";
import type { DatabaseConnection } from "../../database/database.types";
import {
  AuditRepository,
  type RecordAuditEventInput,
} from "./audit.repository";

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  record(input: RecordAuditEventInput, connection?: DatabaseConnection) {
    return this.auditRepository.record(input, connection);
  }
}
