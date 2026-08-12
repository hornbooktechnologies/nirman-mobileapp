import { BadRequestException, type ArgumentsHost } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";

describe("GlobalExceptionFilter", () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: "GET", url: "/workers" }),
    }),
  } as unknown as ArgumentsHost;
  const filter = new GlobalExceptionFilter();

  beforeEach(() => {
    jest.clearAllMocks();
    response.status.mockReturnValue(response);
  });

  it("serializes a stable structured error and keeps legacy compatibility fields", () => {
    filter.catch(
      new BadRequestException({
        code: "WORKER_INACTIVE",
        message: "Inactive worker cannot be assigned",
        details: { workerId: "worker-id" },
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Inactive worker cannot be assigned",
      errors: [],
      error: {
        code: "WORKER_INACTIVE",
        message: "Inactive worker cannot be assigned",
        details: { workerId: "worker-id" },
      },
    });
  });

  it("maps class-validator messages to the approved validation error contract", () => {
    filter.catch(
      new BadRequestException({ message: ["name must be a string"] }),
      host,
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors: [{ message: "name must be a string" }],
      error: {
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        details: [{ message: "name must be a string" }],
      },
    });
  });
});
