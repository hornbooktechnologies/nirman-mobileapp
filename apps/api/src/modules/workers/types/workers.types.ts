import type {
  WorkerAssignmentStatus,
  WorkerStatus,
} from '@nirman-app/shared';
import type { DbRow } from '../../../database/database.types';

export interface WorkerRow extends DbRow {
  id: string;
  organization_id: string;
  worker_code: string;
  name: string;
  trade: string;
  mobile_number: string | null;
  notes: string | null;
  status: WorkerStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deactivated_at: Date | null;
  deactivated_by: string | null;
  activeAssignmentCount?: number;
}

export interface WorkerAssignmentRow extends DbRow {
  id: string;
  organization_id: string;
  project_id: string;
  worker_id: string;
  project_name?: string | null;
  role_label: string | null;
  daily_rate: string | null;
  status: WorkerAssignmentStatus;
  starts_on: Date;
  ends_on: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  ended_at: Date | null;
  ended_by: string | null;
}
