import { normalizePaginationParams } from "./database.service";

describe("normalizePaginationParams", () => {
  it("binds numeric LIMIT and OFFSET values as strings", () => {
    const params = ["organization-id", 20, 0] as const;

    expect(
      normalizePaginationParams(
        "SELECT * FROM workers WHERE organization_id = ? LIMIT ? OFFSET ?",
        params,
      ),
    ).toEqual(["organization-id", "20", "0"]);
    expect(params).toEqual(["organization-id", 20, 0]);
  });

  it("supports LIMIT without OFFSET and LIMIT offset,count syntax", () => {
    expect(
      normalizePaginationParams(
        "SELECT * FROM notifications ORDER BY created_at LIMIT ? FOR UPDATE",
        [100],
      ),
    ).toEqual(["100"]);
    expect(
      normalizePaginationParams("SELECT * FROM workers LIMIT ?, ?", [20, 10]),
    ).toEqual(["20", "10"]);
  });

  it("does not change ordinary numeric parameters or existing strings", () => {
    expect(
      normalizePaginationParams(
        "SELECT * FROM workers WHERE daily_rate >= ? LIMIT ? OFFSET ?",
        [500, "20", "0"],
      ),
    ).toEqual([500, "20", "0"]);
  });
});
