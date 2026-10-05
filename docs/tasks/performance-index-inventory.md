# Live database index inventory

Read-only snapshot from configured MySQL; 2026-10-05T09:09:58.107Z. Includes all 63 tables and 410 indexes (785 index-column entries). TABLE_ROWS is an InnoDB estimate, sometimes zero even when data exists; exact counts for selected tables are in the evidence JSON. No index was changed.

## attendance_exceptions

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_attendance_exceptions_deleted_by` | NON-UNIQUE | `deleted_by` |
| `fk_attendance_exceptions_project_organization` | NON-UNIQUE | `project_id, organization_id` |
| `fk_attendance_exceptions_recorded_by` | NON-UNIQUE | `recorded_by` |
| `fk_attendance_exceptions_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_attendance_exceptions_assignment_date` | NON-UNIQUE | `worker_assignment_id, work_date` |
| `idx_attendance_exceptions_project_date` | NON-UNIQUE | `organization_id, project_id, work_date` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_attendance_exceptions_active_worker_date` | UNIQUE | `organization_id, project_id, worker_assignment_id, work_date, active_exception_key` |

## attendance_records

Estimated rows: 20; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_attendance_deleted_by` | NON-UNIQUE | `deleted_by` |
| `idx_attendance_last_edited_by` | NON-UNIQUE | `last_edited_by` |
| `idx_attendance_marked_by` | NON-UNIQUE | `marked_by` |
| `idx_attendance_project_date` | NON-UNIQUE | `organization_id, project_id, work_date` |
| `idx_attendance_worker_date` | NON-UNIQUE | `worker_assignment_id, work_date` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_attendance_active_worker_date` | UNIQUE | `active_record_key` |

## audit_events

Estimated rows: 60; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_audit_events_project` | NON-UNIQUE | `project_id, organization_id` |
| `idx_audit_events_action` | NON-UNIQUE | `organization_id, action, created_at` |
| `idx_audit_events_actor` | NON-UNIQUE | `actor_user_id, created_at` |
| `idx_audit_events_entity` | NON-UNIQUE | `organization_id, entity_type, entity_id, created_at` |
| `idx_audit_events_scope_time` | NON-UNIQUE | `organization_id, project_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |

## file_assets

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_file_assets_project_scope` | NON-UNIQUE | `project_id, organization_id` |
| `fk_file_assets_uploader_member` | NON-UNIQUE | `uploaded_by_member_id, organization_id` |
| `fk_file_assets_uploader_user` | NON-UNIQUE | `uploaded_by_user_id` |
| `idx_file_assets_project_created` | NON-UNIQUE | `organization_id, project_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_file_assets_context` | UNIQUE | `organization_id, context_type, context_id` |
| `uq_file_assets_id_scope` | UNIQUE | `id, organization_id, project_id` |
| `uq_file_assets_storage_key` | UNIQUE | `storage_key` |

## gallery_entries

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_gallery_entries_file_scope` | NON-UNIQUE | `file_asset_id, organization_id, project_id` |
| `fk_gallery_entries_project_scope` | NON-UNIQUE | `project_id, organization_id` |
| `fk_gallery_entries_reviewer_member` | NON-UNIQUE | `reviewed_by_member_id, organization_id` |
| `fk_gallery_entries_reviewer_user` | NON-UNIQUE | `reviewed_by_user_id` |
| `fk_gallery_entries_uploader_member` | NON-UNIQUE | `uploaded_by_member_id, organization_id` |
| `fk_gallery_entries_uploader_user` | NON-UNIQUE | `uploaded_by_user_id` |
| `idx_gallery_project_diary` | NON-UNIQUE | `organization_id, project_id, captured_at, id` |
| `idx_gallery_project_review` | NON-UNIQUE | `organization_id, project_id, status, captured_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_gallery_entries_file` | UNIQUE | `file_asset_id` |
| `uq_gallery_entries_idempotency` | UNIQUE | `organization_id, idempotency_key` |
| `uq_gallery_entries_id_scope` | UNIQUE | `id, organization_id, project_id` |

## invitations

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_invitations_created_by` | NON-UNIQUE | `created_by` |
| `idx_invitations_expires_at` | NON-UNIQUE | `expires_at` |
| `idx_invitations_organization_status` | NON-UNIQUE | `organization_id, status` |
| `idx_invitations_user_status` | NON-UNIQUE | `user_id, status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_invitations_membership` | UNIQUE | `membership_id` |
| `uq_invitations_token_hash` | UNIQUE | `token_hash` |

## kharchi_adjustments

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_kharchi_adjustments_advance` | NON-UNIQUE | `kharchi_advance_id, organization_id, project_id` |
| `idx_kharchi_adjustments_advance` | NON-UNIQUE | `kharchi_advance_id, created_at` |
| `idx_kharchi_adjustments_recorded_by` | NON-UNIQUE | `recorded_by` |
| `idx_kharchi_adjustments_scope` | NON-UNIQUE | `organization_id, project_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_kharchi_adjustments_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## kharchi_advances

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_kharchi_advances_project` | NON-UNIQUE | `project_id, organization_id` |
| `fk_kharchi_advances_worker` | NON-UNIQUE | `worker_id, organization_id` |
| `idx_kharchi_advances_assignment` | NON-UNIQUE | `worker_assignment_id` |
| `idx_kharchi_advances_project_date` | NON-UNIQUE | `organization_id, project_id, request_date, created_at` |
| `idx_kharchi_advances_recorded_by` | NON-UNIQUE | `recorded_by` |
| `idx_kharchi_advances_worker_date` | NON-UNIQUE | `organization_id, project_id, worker_id, request_date, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_kharchi_advances_idempotency` | UNIQUE | `organization_id, idempotency_key` |
| `uq_kharchi_advances_id_scope` | UNIQUE | `id, organization_id, project_id` |

## kharchi_deduction_allocations

Estimated rows: 12; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_kharchi_allocations_advance` | NON-UNIQUE | `kharchi_advance_id, organization_id, project_id` |
| `fk_kharchi_allocations_worker` | NON-UNIQUE | `worker_id, organization_id` |
| `idx_kharchi_allocations_advance` | NON-UNIQUE | `kharchi_advance_id, deducted_at` |
| `idx_kharchi_allocations_recorded_by` | NON-UNIQUE | `recorded_by` |
| `idx_kharchi_allocations_wage_batch` | NON-UNIQUE | `wage_batch_id` |
| `idx_kharchi_allocations_wage_item` | NON-UNIQUE | `wage_item_id` |
| `idx_kharchi_allocations_worker` | NON-UNIQUE | `organization_id, project_id, worker_id, deducted_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_kharchi_allocation_source_target` | UNIQUE | `kharchi_advance_id, wage_item_id` |

## kharchi_deduction_allocation_reversals

Estimated rows: 2; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_kharchi_reversals_project` | NON-UNIQUE | `project_id, organization_id` |
| `idx_kharchi_reversals_actor` | NON-UNIQUE | `reversed_by` |
| `idx_kharchi_reversals_batch` | NON-UNIQUE | `wage_batch_id, reversed_at` |
| `idx_kharchi_reversals_scope` | NON-UNIQUE | `organization_id, project_id, reversed_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_kharchi_allocation_reversal` | UNIQUE | `allocation_id` |

## material_deliveries

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_material_deliveries_purchase` | NON-UNIQUE | `material_purchase_id, material_request_id, organization_id, project_id` |
| `fk_material_deliveries_recorded_by` | NON-UNIQUE | `recorded_by` |
| `fk_material_deliveries_request` | NON-UNIQUE | `material_request_id, organization_id, project_id` |
| `idx_material_deliveries_purchase` | NON-UNIQUE | `material_purchase_id, created_at` |
| `idx_material_deliveries_request_time` | NON-UNIQUE | `material_request_id, delivered_on, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_material_deliveries_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## material_purchases

Estimated rows: 0; exact audited count: 10. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_material_purchases_recorded_by` | NON-UNIQUE | `recorded_by` |
| `fk_material_purchases_request` | NON-UNIQUE | `material_request_id, organization_id, project_id` |
| `idx_material_purchases_request_time` | NON-UNIQUE | `material_request_id, purchased_on, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_material_purchases_idempotency` | UNIQUE | `organization_id, idempotency_key` |
| `uq_material_purchases_id_scope` | UNIQUE | `id, material_request_id, organization_id, project_id` |

## material_purchase_payments

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_material_purchase_payments_date` | NON-UNIQUE | `organization_id, project_id, payment_date` |
| `idx_material_purchase_payments_source` | NON-UNIQUE | `material_purchase_id` |
| `material_purchase_id` | NON-UNIQUE | `material_purchase_id, material_request_id, organization_id, project_id` |
| `PRIMARY` | PRIMARY | `id` |
| `recorded_by` | NON-UNIQUE | `recorded_by` |
| `uq_material_purchase_payments_retry` | UNIQUE | `organization_id, project_id, idempotency_key` |
| `uq_material_purchase_payments_scope` | UNIQUE | `id, organization_id, project_id` |

## material_purchase_payments_voids

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `payment_id` | NON-UNIQUE | `payment_id, organization_id, project_id` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_material_purchase_payments_void` | UNIQUE | `payment_id` |
| `uq_material_purchase_payments_void_retry` | UNIQUE | `organization_id, project_id, idempotency_key` |
| `voided_by` | NON-UNIQUE | `voided_by` |

## material_requests

Estimated rows: 16; exact audited count: 16. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_material_requests_created_by` | NON-UNIQUE | `created_by` |
| `fk_material_requests_project` | NON-UNIQUE | `project_id, organization_id` |
| `fk_material_requests_requester` | NON-UNIQUE | `requested_by_member_id, organization_id` |
| `fk_material_requests_responsible` | NON-UNIQUE | `responsible_contractor_member_id, organization_id` |
| `fk_material_requests_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_material_requests_requester` | NON-UNIQUE | `requested_by_member_id, created_at` |
| `idx_material_requests_responsible` | NON-UNIQUE | `responsible_contractor_member_id, status` |
| `idx_material_requests_scope_requested` | NON-UNIQUE | `organization_id, project_id, requested_on, created_at` |
| `idx_material_requests_scope_status` | NON-UNIQUE | `organization_id, project_id, status, required_by_date` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_material_requests_idempotency` | UNIQUE | `organization_id, idempotency_key` |
| `uq_material_requests_id_scope` | UNIQUE | `id, organization_id, project_id` |

## material_request_events

Estimated rows: 19; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_material_events_actor_member` | NON-UNIQUE | `actor_member_id, organization_id` |
| `fk_material_events_request` | NON-UNIQUE | `material_request_id, organization_id, project_id` |
| `idx_material_events_actor` | NON-UNIQUE | `actor_user_id, created_at` |
| `idx_material_events_request_time` | NON-UNIQUE | `material_request_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_material_events_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## material_workflow_migrations

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_material_workflow_migration_request` | NON-UNIQUE | `material_request_id, organization_id, project_id` |
| `PRIMARY` | PRIMARY | `material_request_id` |

## notifications

Estimated rows: 37; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_notifications_project` | NON-UNIQUE | `project_id, organization_id` |
| `idx_notifications_project_time` | NON-UNIQUE | `organization_id, project_id, created_at` |
| `idx_notifications_recipient_read` | NON-UNIQUE | `organization_id, user_id, read_at, created_at` |
| `idx_notifications_reference` | NON-UNIQUE | `organization_id, reference_type, reference_id` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_notifications_recipient_dedupe` | UNIQUE | `user_id, dedupe_key` |

## notification_push_deliveries

Estimated rows: 25; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_notification_push_deliveries_device` | NON-UNIQUE | `device_id` |
| `idx_notification_push_delivery_queue` | NON-UNIQUE | `status, next_attempt_at, locked_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_notification_push_delivery` | UNIQUE | `notification_id, device_id` |

## notification_push_devices

Estimated rows: 11; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_notification_push_devices_delivery` | NON-UNIQUE | `user_id, organization_id, active` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_notification_push_device_owner_token` | UNIQUE | `organization_id, user_id, expo_push_token` |

## organizations

Estimated rows: 4; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_organizations_created_by` | NON-UNIQUE | `created_by` |
| `idx_organizations_logo_file_id` | NON-UNIQUE | `logo_file_id` |
| `idx_organizations_status` | NON-UNIQUE | `status` |
| `idx_organizations_type_status` | NON-UNIQUE | `type, status` |
| `idx_organizations_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |

## organization_members

Estimated rows: 37; exact audited count: 47. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_organization_members_created_by` | NON-UNIQUE | `created_by` |
| `idx_organization_members_invited_by` | NON-UNIQUE | `invited_by` |
| `idx_organization_members_organization_status` | NON-UNIQUE | `organization_id, status` |
| `idx_organization_members_role_status` | NON-UNIQUE | `role_id, status` |
| `idx_organization_members_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_organization_members_user_status` | NON-UNIQUE | `user_id, status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_organization_members_id_organization` | UNIQUE | `id, organization_id` |
| `uq_organization_members_organization_user` | UNIQUE | `organization_id, user_id` |

## organization_subscriptions

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_organization_subscriptions_assigned_by` | NON-UNIQUE | `assigned_by` |
| `idx_organization_subscriptions_plan_status` | NON-UNIQUE | `plan_id, status` |
| `idx_organization_subscriptions_validity` | NON-UNIQUE | `status, starts_at, ends_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_organization_subscriptions_organization` | UNIQUE | `organization_id` |

## organization_work_calendars

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_organization_work_calendars_created_by` | NON-UNIQUE | `created_by` |
| `fk_organization_work_calendars_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_organization_work_calendars_organization` | UNIQUE | `organization_id` |

## password_reset_requests

Estimated rows: 4; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_password_reset_requests_email_created` | NON-UNIQUE | `email_hash, created_at` |
| `idx_password_reset_requests_ip_created` | NON-UNIQUE | `requested_ip_hash, created_at` |
| `idx_password_reset_requests_user_active` | NON-UNIQUE | `user_id, used_at, expires_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_password_reset_requests_token_hash` | UNIQUE | `token_hash` |

## permission

Estimated rows: 412; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_permission_roleId` | NON-UNIQUE | `roleId` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_permission_resource_action_role` | UNIQUE | `resource, action, roleId` |

## projects

Estimated rows: 19; exact audited count: 26. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_projects_archived_by` | NON-UNIQUE | `archived_by` |
| `idx_projects_cover_file_id` | NON-UNIQUE | `cover_file_id` |
| `idx_projects_created_by` | NON-UNIQUE | `created_by` |
| `idx_projects_organization_city` | NON-UNIQUE | `organization_id, city` |
| `idx_projects_organization_status` | NON-UNIQUE | `organization_id, status` |
| `idx_projects_organization_type_status` | NON-UNIQUE | `organization_id, type, status` |
| `idx_projects_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_projects_id_organization` | UNIQUE | `id, organization_id` |
| `uq_projects_organization_project_code` | UNIQUE | `organization_id, project_code` |

## project_expense_settings

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_project_expense_settings_created_by` | NON-UNIQUE | `created_by` |
| `fk_project_expense_settings_project` | NON-UNIQUE | `project_id, organization_id` |
| `fk_project_expense_settings_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_project_expense_settings_id_scope` | UNIQUE | `id, organization_id, project_id` |
| `uq_project_expense_settings_project` | UNIQUE | `organization_id, project_id` |

## project_expense_setting_events

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_project_expense_setting_events_actor` | NON-UNIQUE | `actor_user_id` |
| `fk_project_expense_setting_events_setting` | NON-UNIQUE | `project_expense_setting_id, organization_id, project_id` |
| `idx_project_expense_setting_events_setting_time` | NON-UNIQUE | `project_expense_setting_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_project_expense_setting_events_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## project_material_approvers

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_material_approver_grantor` | NON-UNIQUE | `granted_by` |
| `fk_material_approver_member` | NON-UNIQUE | `member_id, organization_id` |
| `fk_material_approver_project` | NON-UNIQUE | `project_id, organization_id` |
| `PRIMARY` | PRIMARY | `organization_id, project_id, member_id` |

## project_material_settings

Estimated rows: 3; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_project_material_settings_created_by` | NON-UNIQUE | `created_by` |
| `fk_project_material_settings_project` | NON-UNIQUE | `project_id, organization_id` |
| `fk_project_material_settings_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_project_material_settings_project` | UNIQUE | `organization_id, project_id` |

## project_members

Estimated rows: 16; exact audited count: 22. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_project_members_member_organization` | NON-UNIQUE | `member_id, organization_id` |
| `fk_project_members_project_organization` | NON-UNIQUE | `project_id, organization_id` |
| `idx_project_members_created_by` | NON-UNIQUE | `created_by` |
| `idx_project_members_ended_by` | NON-UNIQUE | `ended_by` |
| `idx_project_members_member_status` | NON-UNIQUE | `member_id, status` |
| `idx_project_members_organization_member_status` | NON-UNIQUE | `organization_id, member_id, status` |
| `idx_project_members_organization_project_status` | NON-UNIQUE | `organization_id, project_id, status` |
| `idx_project_members_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_project_members_project_member` | UNIQUE | `project_id, member_id` |

## project_member_permission_grants

Estimated rows: 34; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_project_permission_grants_member_organization` | NON-UNIQUE | `member_id, organization_id` |
| `fk_project_permission_grants_project_organization` | NON-UNIQUE | `project_id, organization_id` |
| `idx_project_permission_grants_created_by` | NON-UNIQUE | `created_by` |
| `idx_project_permission_grants_member` | NON-UNIQUE | `organization_id, member_id, project_id` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_project_member_permission_grant` | UNIQUE | `project_id, member_id, permission_key` |

## project_progress_updates

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_project_progress_member` | NON-UNIQUE | `updated_by_member_id, organization_id` |
| `fk_project_progress_project` | NON-UNIQUE | `project_id, organization_id` |
| `idx_project_progress_actor` | NON-UNIQUE | `updated_by_user_id, created_at` |
| `idx_project_progress_project_latest` | NON-UNIQUE | `organization_id, project_id, update_date, created_at` |
| `idx_project_progress_stage_latest` | NON-UNIQUE | `organization_id, project_id, stage, update_date, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_project_progress_idempotency` | UNIQUE | `organization_id, idempotency_key` |
| `uq_project_progress_id_scope` | UNIQUE | `id, organization_id, project_id` |

## refreshtoken

Estimated rows: 231; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_refreshtoken_expiresAt` | NON-UNIQUE | `expiresAt` |
| `idx_refreshtoken_userId` | NON-UNIQUE | `userId` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_refreshtoken_token` | UNIQUE | `token` |

## role

Estimated rows: 12; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `PRIMARY` | PRIMARY | `id` |
| `uq_role_name` | UNIQUE | `name` |

## sales_activities

Estimated rows: 49; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_activities_actor` | NON-UNIQUE | `actor_id` |
| `fk_sales_activities_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `idx_sales_activities_lead` | NON-UNIQUE | `organization_id, project_id, lead_id, occurred_at` |
| `PRIMARY` | PRIMARY | `id` |

## sales_bookings

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_bookings_by` | NON-UNIQUE | `booked_by` |
| `fk_sales_bookings_cancelled_by` | NON-UNIQUE | `cancelled_by` |
| `fk_sales_bookings_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `fk_sales_bookings_unit` | NON-UNIQUE | `unit_id, organization_id, project_id` |
| `idx_sales_bookings_project_date` | NON-UNIQUE | `organization_id, project_id, booking_date` |
| `idx_sales_bookings_project_status_date` | NON-UNIQUE | `organization_id, project_id, status, booking_date` |
| `idx_sales_bookings_unit_status` | NON-UNIQUE | `unit_id, status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_bookings_confirmed_lead` | UNIQUE | `lead_id, active_booking_key` |
| `uq_sales_bookings_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## sales_followups

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_followups_assignee` | NON-UNIQUE | `assigned_user_id` |
| `fk_sales_followups_created_by` | NON-UNIQUE | `created_by` |
| `fk_sales_followups_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `idx_sales_followups_assignee_due` | NON-UNIQUE | `organization_id, assigned_user_id, status, scheduled_at` |
| `idx_sales_followups_dashboard_due` | NON-UNIQUE | `organization_id, project_id, assigned_user_id, status, scheduled_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_followups_exact` | UNIQUE | `lead_id, assigned_user_id, scheduled_at, type` |

## sales_leads

Estimated rows: 10; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_leads_assigned_to` | NON-UNIQUE | `assigned_to` |
| `fk_sales_leads_converted_by` | NON-UNIQUE | `converted_by` |
| `fk_sales_leads_created_by` | NON-UNIQUE | `created_by` |
| `fk_sales_leads_interested_unit` | NON-UNIQUE | `interested_unit_id, organization_id, project_id` |
| `fk_sales_leads_project` | NON-UNIQUE | `project_id, organization_id` |
| `idx_sales_leads_assignee` | NON-UNIQUE | `organization_id, assigned_to, current_stage` |
| `idx_sales_leads_dashboard_assignee` | NON-UNIQUE | `organization_id, project_id, assigned_to, current_stage` |
| `idx_sales_leads_mobile` | NON-UNIQUE | `organization_id, primary_mobile` |
| `idx_sales_leads_project_stage` | NON-UNIQUE | `organization_id, project_id, current_stage` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_leads_id_scope` | UNIQUE | `id, organization_id, project_id` |

## sales_lead_assignments

Estimated rows: 26; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_assignments_by` | NON-UNIQUE | `assigned_by` |
| `fk_sales_assignments_from` | NON-UNIQUE | `assigned_from` |
| `fk_sales_assignments_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `fk_sales_assignments_to` | NON-UNIQUE | `assigned_to` |
| `idx_sales_assignments_lead` | NON-UNIQUE | `organization_id, project_id, lead_id, assigned_at` |
| `PRIMARY` | PRIMARY | `id` |

## sales_site_visits

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_site_visits_assignee` | NON-UNIQUE | `assigned_salesperson` |
| `fk_sales_site_visits_created_by` | NON-UNIQUE | `created_by` |
| `fk_sales_site_visits_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `idx_sales_site_visits_assignee` | NON-UNIQUE | `organization_id, assigned_salesperson, status, scheduled_at` |
| `idx_sales_site_visits_dashboard_due` | NON-UNIQUE | `organization_id, project_id, assigned_salesperson, status, scheduled_at` |
| `idx_sales_site_visits_project_date` | NON-UNIQUE | `organization_id, project_id, scheduled_at` |
| `PRIMARY` | PRIMARY | `id` |

## sales_units

Estimated rows: 1; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_units_created_by` | NON-UNIQUE | `created_by` |
| `fk_sales_units_project` | NON-UNIQUE | `project_id, organization_id` |
| `fk_sales_units_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_sales_units_project_status` | NON-UNIQUE | `organization_id, project_id, status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_units_id_scope` | UNIQUE | `id, organization_id, project_id` |
| `uq_sales_units_project_number` | UNIQUE | `organization_id, project_id, unit_number` |

## sales_unit_blocks

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_unit_blocks_by` | NON-UNIQUE | `blocked_by` |
| `fk_sales_unit_blocks_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `fk_sales_unit_blocks_unit` | NON-UNIQUE | `unit_id, organization_id, project_id` |
| `idx_sales_unit_blocks_expiry` | NON-UNIQUE | `status, expires_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_unit_blocks_active` | UNIQUE | `unit_id, active_unit_key` |

## sales_unit_hold_requests

Estimated rows: 5; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_unit_hold_decided_by` | NON-UNIQUE | `decided_by` |
| `fk_sales_unit_hold_requested_by` | NON-UNIQUE | `requested_by` |
| `fk_sales_unit_hold_requests_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `fk_sales_unit_hold_requests_unit` | NON-UNIQUE | `unit_id, organization_id, project_id` |
| `idx_sales_unit_hold_queue` | NON-UNIQUE | `organization_id, project_id, unit_id, status, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_unit_hold_pending_lead` | UNIQUE | `unit_id, lead_id, pending_lead_key` |

## sales_unit_interests

Estimated rows: 7; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_sales_unit_interests_created_by` | NON-UNIQUE | `created_by` |
| `fk_sales_unit_interests_lead` | NON-UNIQUE | `lead_id, organization_id, project_id` |
| `fk_sales_unit_interests_unit` | NON-UNIQUE | `unit_id, organization_id, project_id` |
| `fk_sales_unit_interests_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_sales_unit_interests_lead` | NON-UNIQUE | `organization_id, project_id, lead_id` |
| `idx_sales_unit_interests_unit_status` | NON-UNIQUE | `organization_id, project_id, unit_id, status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_sales_unit_interest_lead` | UNIQUE | `unit_id, lead_id` |

## schema_migrations

Estimated rows: 27; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_schema_migrations_applied_at` | NON-UNIQUE | `applied_at` |
| `idx_schema_migrations_status` | NON-UNIQUE | `status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_schema_migrations_filename` | UNIQUE | `filename` |

## site_expenses

Estimated rows: 7; exact audited count: 11. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_site_expenses_approved_member` | NON-UNIQUE | `approved_by_member_id, organization_id` |
| `fk_site_expenses_approved_user` | NON-UNIQUE | `approved_by_user_id` |
| `fk_site_expenses_created_by` | NON-UNIQUE | `created_by` |
| `fk_site_expenses_project` | NON-UNIQUE | `project_id, organization_id` |
| `fk_site_expenses_recorder_member` | NON-UNIQUE | `recorded_by_member_id, organization_id` |
| `fk_site_expenses_recorder_user` | NON-UNIQUE | `recorded_by_user_id` |
| `fk_site_expenses_rejected_member` | NON-UNIQUE | `rejected_by_member_id, organization_id` |
| `fk_site_expenses_rejected_user` | NON-UNIQUE | `rejected_by_user_id` |
| `fk_site_expenses_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_site_expenses_recorder` | NON-UNIQUE | `recorded_by_member_id, expense_date` |
| `idx_site_expenses_scope_category` | NON-UNIQUE | `organization_id, project_id, category, expense_date` |
| `idx_site_expenses_scope_status` | NON-UNIQUE | `organization_id, project_id, status, expense_date` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_site_expenses_idempotency` | UNIQUE | `organization_id, idempotency_key` |
| `uq_site_expenses_id_scope` | UNIQUE | `id, organization_id, project_id` |

## site_expense_adjustments

Estimated rows: 0; exact audited count: 3. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_site_expense_adjustments_expense` | NON-UNIQUE | `site_expense_id, organization_id, project_id` |
| `fk_site_expense_adjustments_member` | NON-UNIQUE | `recorded_by_member_id, organization_id` |
| `fk_site_expense_adjustments_user` | NON-UNIQUE | `recorded_by_user_id` |
| `idx_site_expense_adjustments_expense_time` | NON-UNIQUE | `site_expense_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_site_expense_adjustments_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## site_expense_events

Estimated rows: 12; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_site_expense_events_actor_member` | NON-UNIQUE | `actor_member_id, organization_id` |
| `fk_site_expense_events_actor_user` | NON-UNIQUE | `actor_user_id` |
| `fk_site_expense_events_expense` | NON-UNIQUE | `site_expense_id, organization_id, project_id` |
| `idx_site_expense_events_expense_time` | NON-UNIQUE | `site_expense_id, created_at` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_site_expense_events_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## site_expense_payments

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_site_expense_payments_date` | NON-UNIQUE | `organization_id, project_id, payment_date` |
| `idx_site_expense_payments_source` | NON-UNIQUE | `site_expense_id` |
| `PRIMARY` | PRIMARY | `id` |
| `recorded_by` | NON-UNIQUE | `recorded_by` |
| `site_expense_id` | NON-UNIQUE | `site_expense_id, organization_id, project_id` |
| `uq_site_expense_payments_retry` | UNIQUE | `organization_id, project_id, idempotency_key` |
| `uq_site_expense_payments_scope` | UNIQUE | `id, organization_id, project_id` |

## site_expense_payments_voids

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `payment_id` | NON-UNIQUE | `payment_id, organization_id, project_id` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_site_expense_payments_void` | UNIQUE | `payment_id` |
| `uq_site_expense_payments_void_retry` | UNIQUE | `organization_id, project_id, idempotency_key` |
| `voided_by` | NON-UNIQUE | `voided_by` |

## subscription_plans

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_subscription_plans_created_by` | NON-UNIQUE | `created_by` |
| `fk_subscription_plans_updated_by` | NON-UNIQUE | `updated_by` |
| `idx_subscription_plans_active` | NON-UNIQUE | `is_active, name` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_subscription_plans_plan_key` | UNIQUE | `plan_key` |

## systemsetting

Estimated rows: 15; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_systemsetting_updatedBy` | NON-UNIQUE | `updatedBy` |
| `PRIMARY` | PRIMARY | `key` |

## user

Estimated rows: 33; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_user_createdBy` | NON-UNIQUE | `createdBy` |
| `idx_user_roleId` | NON-UNIQUE | `roleId` |
| `idx_user_updatedBy` | NON-UNIQUE | `updatedBy` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_user_email` | UNIQUE | `email` |

## wage_batches

Estimated rows: 9; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_wage_batches_cancelled_by` | NON-UNIQUE | `cancelled_by` |
| `idx_wage_batches_confirmed_by` | NON-UNIQUE | `confirmed_by` |
| `idx_wage_batches_generated_by` | NON-UNIQUE | `generated_by` |
| `idx_wage_batches_project_period` | NON-UNIQUE | `organization_id, project_id, period_start, period_end` |
| `idx_wage_batches_status` | NON-UNIQUE | `organization_id, project_id, status` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_wage_batches_active_period` | UNIQUE | `active_batch_key` |

## wage_items

Estimated rows: 44; exact audited count: 47. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_wage_items_payment_status` | NON-UNIQUE | `wage_batch_id, payment_status` |
| `idx_wage_items_project_assignment` | NON-UNIQUE | `organization_id, project_id, worker_assignment_id` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_wage_items_batch_assignment` | UNIQUE | `wage_batch_id, worker_assignment_id` |

## wage_payments

Estimated rows: 8; exact audited count: 32. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_wage_payments_batch` | NON-UNIQUE | `wage_batch_id` |
| `idx_wage_payments_item` | NON-UNIQUE | `wage_item_id` |
| `idx_wage_payments_project_date` | NON-UNIQUE | `organization_id, project_id, payment_date` |
| `idx_wage_payments_recorded_by` | NON-UNIQUE | `recorded_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_wage_payments_idempotency` | UNIQUE | `organization_id, idempotency_key` |

## workers

Estimated rows: 25; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_workers_created_by` | NON-UNIQUE | `created_by` |
| `idx_workers_deactivated_by` | NON-UNIQUE | `deactivated_by` |
| `idx_workers_organization_mobile` | NON-UNIQUE | `organization_id, mobile_number` |
| `idx_workers_organization_name` | NON-UNIQUE | `organization_id, name` |
| `idx_workers_organization_status` | NON-UNIQUE | `organization_id, status` |
| `idx_workers_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_workers_id_organization` | UNIQUE | `id, organization_id` |
| `uq_workers_organization_worker_code` | UNIQUE | `organization_id, worker_code` |

## worker_assignment_rate_periods

Estimated rows: 43; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `idx_worker_assignment_rate_changed_by` | NON-UNIQUE | `changed_by` |
| `idx_worker_assignment_rate_lookup` | NON-UNIQUE | `organization_id, project_id, worker_assignment_id, effective_from` |
| `idx_worker_assignment_rate_worker` | NON-UNIQUE | `organization_id, worker_id, effective_from` |
| `PRIMARY` | PRIMARY | `id` |
| `uq_worker_assignment_rate_effective` | UNIQUE | `worker_assignment_id, effective_from` |

## worker_primary_project_periods

Estimated rows: 19; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_worker_primary_periods_created_by` | NON-UNIQUE | `created_by` |
| `fk_worker_primary_periods_ended_by` | NON-UNIQUE | `ended_by` |
| `fk_worker_primary_periods_updated_by` | NON-UNIQUE | `updated_by` |
| `fk_worker_primary_periods_worker_organization` | NON-UNIQUE | `worker_id, organization_id` |
| `idx_worker_primary_periods_assignment` | NON-UNIQUE | `worker_assignment_id` |
| `idx_worker_primary_periods_worker_range` | NON-UNIQUE | `organization_id, worker_id, starts_on, ends_on` |
| `PRIMARY` | PRIMARY | `id` |

## worker_project_assignments

Estimated rows: 29; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_worker_assignments_project_organization` | NON-UNIQUE | `project_id, organization_id` |
| `fk_worker_assignments_worker_organization` | NON-UNIQUE | `worker_id, organization_id` |
| `idx_worker_assignments_created_by` | NON-UNIQUE | `created_by` |
| `idx_worker_assignments_dashboard_active` | NON-UNIQUE | `organization_id, project_id, status, starts_on, ends_on` |
| `idx_worker_assignments_ended_by` | NON-UNIQUE | `ended_by` |
| `idx_worker_assignments_organization_project_status` | NON-UNIQUE | `organization_id, project_id, status` |
| `idx_worker_assignments_organization_worker_status` | NON-UNIQUE | `organization_id, worker_id, status` |
| `idx_worker_assignments_project_worker` | NON-UNIQUE | `project_id, worker_id` |
| `idx_worker_assignments_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |

## work_calendar_overrides

Estimated rows: 0; exact audited count: not collected. Engine: InnoDB.

| Index | Kind | Columns in order |
| --- | --- | --- |
| `fk_work_calendar_overrides_project_organization` | NON-UNIQUE | `project_id, organization_id` |
| `idx_work_calendar_overrides_created_by` | NON-UNIQUE | `created_by` |
| `idx_work_calendar_overrides_deleted_by` | NON-UNIQUE | `deleted_by` |
| `idx_work_calendar_overrides_scope_range` | NON-UNIQUE | `organization_id, project_id, start_date, end_date, deleted_at` |
| `idx_work_calendar_overrides_updated_by` | NON-UNIQUE | `updated_by` |
| `PRIMARY` | PRIMARY | `id` |
