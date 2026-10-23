import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateWebsiteEnquiryDto } from "./website-enquiries.dto";

const validEnquiry = {
  name: "Customer",
  phone: "9876543210",
  email: "customer@example.com",
  organizationType: "BUILDER",
  submissionKey: "submission-id",
};

describe("CreateWebsiteEnquiryDto", () => {
  it.each(["BUILDER", "CONTRACTOR"])(
    "accepts %s organization type",
    async (organizationType) => {
      const dto = plainToInstance(CreateWebsiteEnquiryDto, {
        ...validEnquiry,
        organizationType,
      });

      expect(await validate(dto)).toHaveLength(0);
    },
  );

  it("rejects an unsupported organization type", async () => {
    const dto = plainToInstance(CreateWebsiteEnquiryDto, {
      ...validEnquiry,
      organizationType: "DEVELOPER",
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "organizationType")).toBe(
      true,
    );
  });
});
