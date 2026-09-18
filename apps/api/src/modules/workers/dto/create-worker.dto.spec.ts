import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateWorkerDto } from "./create-worker.dto";

describe("CreateWorkerDto daily rate", () => {
  it.each([undefined, null, "", "   ", "invalid", -1, true])(
    "rejects missing or invalid rate %p",
    async (dailyRate) => {
      const dto = plainToInstance(CreateWorkerDto, { name: "Worker", trade: "Helper", dailyRate });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === "dailyRate")).toBe(true);
    },
  );

  it.each([0, 500, "500.50"])("accepts supplied rate %p", async (dailyRate) => {
    const dto = plainToInstance(CreateWorkerDto, { name: "Worker", trade: "Helper", dailyRate });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.dailyRate).toBe(Number(dailyRate));
  });
});
