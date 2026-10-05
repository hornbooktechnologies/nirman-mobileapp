-- Approved performance slice: two additive default-list indexes only.
-- Preserve all existing keys, uniqueness, financial rows and workflows.
ALTER TABLE material_requests
  ADD INDEX idx_material_requests_scope_updated (organization_id, project_id, updated_at, id),
  ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE site_expenses
  ADD INDEX idx_site_expenses_scope_date (organization_id, project_id, expense_date, created_at, id),
  ALGORITHM=INPLACE, LOCK=NONE;
