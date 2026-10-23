import * as fs from "node:fs";
import * as path from "node:path";

describe("website enquiry status migrations", () => {
  const migrationsDir = path.resolve(__dirname, "../sql/migrations");

  it("replaces the legacy status check with the complete workflow vocabulary", () => {
    const migration = fs.readFileSync(
      path.join(migrationsDir, "034_fix_website_enquiry_status_check.sql"),
      "utf8",
    );

    expect(migration).toContain("CONSTRAINT_TYPE = 'CHECK'");
    expect(migration).toContain("DROP CHECK");
    expect(migration).toContain("chk_website_enquiries_status");
    for (const status of [
      "SUBMITTED",
      "CONTACTED",
      "FOLLOW_UP",
      "INTERESTED",
      "NOT_INTERESTED",
      "CREATED",
    ]) {
      expect(migration).toContain(`'${status}'`);
    }
    expect(migration).not.toMatch(/CHECK\s*\([^;]*(?:'NEW'|'CONVERTED')/s);
  });
});
