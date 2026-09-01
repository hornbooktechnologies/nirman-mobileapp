-- Add explicit total-price versus per-square-foot pricing to Sales inventory.
-- Source-only until separately approved for the configured database target.

ALTER TABLE sales_units
  ADD COLUMN price_basis VARCHAR(20) NOT NULL DEFAULT 'TOTAL' AFTER base_price,
  ADD COLUMN rate_per_sqft DECIMAL(15,2) NULL AFTER price_basis;
