import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { WEEKDAYS, type WorkingWeek } from "@nirman-app/shared";
import { UpdateOrganizationWorkCalendarDto } from "./calendar.dto";

const workingWeek: WorkingWeek = {
  MONDAY: true,
  TUESDAY: true,
  WEDNESDAY: true,
  THURSDAY: true,
  FRIDAY: true,
  SATURDAY: true,
  SUNDAY: false,
};

function errorsFor(payload: object) {
  return validateSync(
    plainToInstance(UpdateOrganizationWorkCalendarDto, payload),
    { whitelist: true, forbidNonWhitelisted: true },
  );
}

describe("UpdateOrganizationWorkCalendarDto", () => {
  it("accepts the canonical uppercase weekly pattern", () => {
    expect(errorsFor({ timezone: "Asia/Kolkata", workingWeek })).toEqual([]);
  });

  it.each(WEEKDAYS)("requires %s to be present and Boolean", (weekday) => {
    const missing = { ...workingWeek } as Partial<WorkingWeek>;
    delete missing[weekday];
    expect(
      errorsFor({ timezone: "Asia/Kolkata", workingWeek: missing }),
    ).not.toEqual([]);

    expect(
      errorsFor({
        timezone: "Asia/Kolkata",
        workingWeek: { ...workingWeek, [weekday]: "true" },
      }),
    ).not.toEqual([]);
  });

  it("rejects a lowercase-only weekly pattern", () => {
    expect(
      errorsFor({
        timezone: "Asia/Kolkata",
        workingWeek: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: false,
        },
      }),
    ).not.toEqual([]);
  });
});
