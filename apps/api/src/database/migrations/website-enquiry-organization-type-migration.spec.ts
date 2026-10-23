import fs from "node:fs";
import path from "node:path";

describe("website enquiry organization type migration", () => {
  const migration = fs.readFileSync(
    path.resolve(
      __dirname,
      "../sql/migrations/035_website_enquiry_organization_type.sql",
    ),
    "utf8",
  );

  it("adds a nullable organization type for historical enquiries", () => {
    expect(migration).toContain("organization_type VARCHAR(16) NULL");
  });

  it.each(["BUILDER", "CONTRACTOR"])("allows %s enquiries", (type) => {
    expect(migration).toContain(`'${type}'`);
  });
});
