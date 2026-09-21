import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
function load(path, modules = {}) {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  const exports = {};
  new Function("require", "exports", outputText)((id) => {
    assert.ok(Object.hasOwn(modules, id), id);
    return modules[id];
  }, exports);
  return exports;
}
const shared = load("../../../../../packages/shared/src/constants/sales.ts");
const { parseUnitImport, UNIT_IMPORT_COLUMNS } = load("./unit-import.ts", {
  "@nirman-app/shared": shared,
});
const {
  validateUnit,
  unitInput,
  editableUnit,
  inventoryPermission,
  unitSnapshot,
} = load("./inventory-rules.ts");
const { salesKey, salesScope, canWriteLead } = load("./sales-rules.ts");
const csv = (...rows) => [UNIT_IMPORT_COLUMNS.join(","), ...rows].join("\r\n");
test("CSV preserves quoted fields and converts lakh/crore amounts without computing per-area totals", () => {
  const parsed = parseUnitImport(
    "\uFEFF" +
      csv(
        'A1,Flat,"East, Tower",1,1000,East,TOTAL,45,LAKH,,AVAILABLE',
        "A2,Flat,B,2,1500,West,PER_SQFT,,,5000,AVAILABLE",
        "A3,Flat,C,3,,,TOTAL,1.5,CRORE,,SOLD",
      ),
  );
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.units[0].wingTower, "East, Tower");
  assert.equal(parsed.units[0].basePrice, 4500000);
  assert.equal(parsed.units[1].basePrice, undefined);
  assert.equal(parsed.units[1].ratePerSqft, 5000);
  assert.equal(parsed.units[2].basePrice, 15000000);
});
test("CSV rejects malformed/ambiguous input, invalid amounts and workflow statuses before preview", () => {
  for (const text of [
    csv('"unfinished'),
    csv("A,Flat"),
    "unitNumber,unitNumber,unitType,pricingMethod,status\nA,A,Flat,TOTAL,AVAILABLE",
  ]) {
    assert.ok(
      parseUnitImport(text).errors.some((e) => e.code === "MALFORMED_CSV"),
    );
  }
  for (const status of ["BOOKED", "BLOCKED", "UNKNOWN"]) {
    assert.ok(
      parseUnitImport(csv(`A,Flat,,,,,TOTAL,1,RUPEE,,${status}`)).errors.some(
        (e) => e.code === "STATUS",
      ),
    );
  }
  for (const amount of ["0", "-1", "NaN", "Infinity"]) {
    assert.ok(
      parseUnitImport(csv(`A,Flat,,,,,TOTAL,${amount},RUPEE,,AVAILABLE`)).errors
        .length,
    );
  }
  assert.ok(
    parseUnitImport(csv("A,Flat,,,,,TOTAL,1,RUPEE,5,AVAILABLE")).errors.some(
      (e) => e.code === "UNIT_PRICE_INVALID",
    ),
  );
  assert.ok(
    parseUnitImport(
      csv(...Array(501).fill("A,Flat,,,,,TOTAL,1,RUPEE,,AVAILABLE")),
    ).errors.some((e) => e.code === "LIMIT"),
  );
});
test("pricing payload uses only the selected pricing method and blocks invalid workflow edits", () => {
  const v = {
    unitNumber: "A",
    unitType: "Flat",
    priceBasis: "TOTAL",
    totalPrice: "45",
    priceUnit: "LAKH",
    ratePerSqft: "5000",
    status: "AVAILABLE",
  };
  assert.deepEqual(validateUnit(v), {});
  assert.equal(unitInput(v).basePrice, 4500000);
  assert.equal(unitInput(v).ratePerSqft, undefined);
  const per = { ...v, priceBasis: "PER_SQFT", areaSqft: "1000" };
  assert.equal(unitInput(per).basePrice, undefined);
  assert.equal(unitInput(per).ratePerSqft, 5000);
  assert.ok(validateUnit({ ...per, areaSqft: "0" }).areaSqft);
  assert.ok(validateUnit({ ...v, status: "BOOKED" }).status);
  assert.equal(editableUnit("BLOCKED"), false);
});
test("effective grants and active project are required independently of lead visibility", () => {
  assert.equal(
    inventoryPermission(["inventory:manage"], true, "inventory:manage"),
    false,
  );
  assert.equal(
    inventoryPermission(
      ["inventory:read", "inventory:manage"],
      false,
      "inventory:manage",
    ),
    false,
  );
  assert.equal(
    inventoryPermission(
      ["inventory:read", "inventory:manage"],
      true,
      "inventory:manage",
    ),
    true,
  );
  assert.equal(
    inventoryPermission(
      ["inventory:read", "inventory:request-block"],
      true,
      "inventory:block",
    ),
    false,
  );
  assert.equal(
    canWriteLead(
      ["inventory:block", "leads:update", "leads:read-own"],
      true,
      "leads:update",
      { assignedTo: "other", createdBy: "other" },
      "self",
    ),
    false,
  );
});
test("cache identity changes for every user, organization and project boundary", () => {
  const values = [
    salesScope("u", "o", "p"),
    salesScope("v", "o", "p"),
    salesScope("u", "q", "p"),
    salesScope("u", "o", "r"),
  ];
  assert.equal(new Set(values).size, 4);
  assert.notDeepEqual(salesKey("o", "p"), salesKey("o", "q"));
  assert.notDeepEqual(salesKey("o", "p"), salesKey("q", "p"));
});
test("preflight snapshot detects availability, price and active-block changes", () => {
  const u = {
    id: "u",
    unitNumber: "A",
    unitType: "Flat",
    wingTower: null,
    floor: null,
    areaSqft: 1000,
    facing: null,
    basePrice: 5000000,
    priceBasis: "TOTAL",
    ratePerSqft: null,
    status: "AVAILABLE",
    activeBlockId: null,
    blockedForLeadId: null,
    blockExpiresAt: null,
  };
  for (const key of Object.keys(u))
    assert.notEqual(
      unitSnapshot(u),
      unitSnapshot({ ...u, [key]: "changed" }),
      key,
    );
  assert.equal(unitSnapshot(u), unitSnapshot({ ...u, interestCount: 8 }));
});
test("inventory transport scopes and encodes identifiers, preserves payloads and cancellation", async () => {
  const calls = [];
  const api = Object.fromEntries(
    ["get", "post", "put"].map((method) => [
      method,
      async (...args) => {
        calls.push([method, ...args]);
        return [];
      },
    ]),
  );
  const { inventoryService: s } = load("./services/inventory.service.ts", {
    "@/lib/api/api-client": { api },
  });
  const signal = new AbortController().signal;
  await s.units("o/a", "p/b", { status: "AVAILABLE", search: "Tower" }, signal);
  await s.interests("o/a", "p/b", "u/x", signal);
  await s.interest("o/a", "p/b", "u/x", {
    leadId: "l",
    status: "HIGH_INTENT",
    notes: "Call",
  });
  await s.request("o/a", "p/b", "u/x", { leadId: "l", notes: "Hold" });
  await s.decide("o/a", "p/b", "r/x", {
    decision: "APPROVED",
    expiresAt: "2026-10-01T00:00:00Z",
  });
  await s.release("o/a", "p/b", "b/x");
  assert.equal(calls[0][1], "/organizations/o%2Fa/projects/p%2Fb/sales/units");
  assert.equal(calls[0][2].signal, signal);
  assert.deepEqual(calls[0][2].params, {
    status: "AVAILABLE",
    search: "Tower",
  });
  assert.ok(calls[1][1].endsWith("/units/u%2Fx/interests"));
  assert.equal(calls[1][2].signal, signal);
  assert.deepEqual(calls[2][2], {
    leadId: "l",
    status: "HIGH_INTENT",
    notes: "Call",
  });
  assert.ok(calls[3][1].endsWith("/hold-requests"));
  assert.deepEqual(calls[4][2], {
    decision: "APPROVED",
    expiresAt: "2026-10-01T00:00:00Z",
  });
  assert.ok(calls[5][1].endsWith("/unit-blocks/b%2Fx/release"));
});
test("uncertain imports and holds are never automatically replayed by the adapter", async () => {
  let attempts = 0;
  const { inventoryService: s } = load("./services/inventory.service.ts", {
    "@/lib/api/api-client": {
      api: {
        post: async () => {
          attempts++;
          throw new Error("Response lost");
        },
      },
    },
  });
  await assert.rejects(s.import("o", "p", []), /Response lost/);
  assert.equal(attempts, 1);
  await assert.rejects(
    s.request("o", "p", "u", { leadId: "l" }),
    /Response lost/,
  );
  assert.equal(attempts, 2);
});
