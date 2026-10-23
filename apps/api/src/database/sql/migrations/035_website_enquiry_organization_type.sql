-- Record whether a marketing-site enquiry came from a builder or contractor.
-- Historical enquiries remain NULL because their organization type is unknown.
ALTER TABLE website_enquiries
  ADD COLUMN organization_type VARCHAR(16) NULL AFTER email,
  ADD CONSTRAINT chk_website_enquiries_organization_type
    CHECK (organization_type IS NULL OR organization_type IN ('BUILDER', 'CONTRACTOR'));
