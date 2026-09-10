-- Role-specific dashboard read-path indexes.
-- The dashboard remains a live aggregate; it does not persist duplicated business totals.

ALTER TABLE worker_project_assignments
  ADD KEY idx_worker_assignments_dashboard_active (
    organization_id, project_id, status, starts_on, ends_on
  );

ALTER TABLE sales_leads
  ADD KEY idx_sales_leads_dashboard_assignee (
    organization_id, project_id, assigned_to, current_stage
  );

ALTER TABLE sales_followups
  ADD KEY idx_sales_followups_dashboard_due (
    organization_id, project_id, assigned_user_id, status, scheduled_at
  );

ALTER TABLE sales_site_visits
  ADD KEY idx_sales_site_visits_dashboard_due (
    organization_id, project_id, assigned_salesperson, status, scheduled_at
  );
