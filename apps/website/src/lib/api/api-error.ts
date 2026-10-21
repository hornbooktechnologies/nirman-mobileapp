export type ApiErrorOptions = {
  readonly status: number;
  readonly message: string;
  readonly details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor({ status, message, details }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}
