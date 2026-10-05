import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  AdjustExpenseDto,
  CreateExpenseDto,
  UpdateExpenseDto,
} from "./expenses.dto";

describe("expense database amount limits", () => {
  it.each([CreateExpenseDto, UpdateExpenseDto, AdjustExpenseDto])(
    "rejects amounts beyond DECIMAL(14,2)",
    async (Dto) => {
      const errors = await validate(
        Object.assign(new Dto(), { amount: 1000000000000 }),
      );
      expect(errors.some((error) => error.property === "amount")).toBe(true);
    },
  );
  it("accepts the supported amount boundary", async () => {
    const errors = await validate(
      plainToInstance(CreateExpenseDto, { amount: 999999999999.99 }),
    );
    expect(errors.some((error) => error.property === "amount")).toBe(false);
  });
  it("rejects excessively large negative adjustments", async () => {
    const errors = await validate(
      plainToInstance(AdjustExpenseDto, { amount: -1000000000000 }),
    );
    expect(errors.some((error) => error.property === "amount")).toBe(true);
  });
});
