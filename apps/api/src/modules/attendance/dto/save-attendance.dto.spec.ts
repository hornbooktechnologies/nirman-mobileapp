import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { SaveAttendanceDto } from "./save-attendance.dto";

describe("SaveAttendanceDto", () => {
  const workerAssignmentId = "00000000-0000-4000-8000-000000000030";

  it("accepts HH:mm and HH:mm:ss attendance times", () => {
    const dto = plainToInstance(SaveAttendanceDto, {
      date: "2026-08-20",
      entries: [
        {
          workerAssignmentId,
          status: "PRESENT",
          checkIn: "05:01",
          checkOut: "04:02",
        },
        {
          workerAssignmentId,
          status: "PRESENT",
          checkIn: "00:20:26",
          checkOut: "00:20:26",
        },
      ],
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it("rejects invalid attendance times", () => {
    const dto = plainToInstance(SaveAttendanceDto, {
      date: "2026-08-20",
      entries: [
        {
          workerAssignmentId,
          status: "PRESENT",
          checkIn: "25:01",
        },
      ],
    });

    const errors = validateSync(dto);
    expect(
      errors[0]?.children?.[0]?.children?.[0]?.constraints?.matches,
    ).toBe("checkIn must be a valid HH:mm or HH:mm:ss time");
  });
});
