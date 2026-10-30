import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const MIN_SECRET_LENGTH = 32;

export function loadEnv() {
  const candidates = [
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), ".env"),
  ];

  const envFile = candidates.find((candidate) => existsSync(candidate));
  if (envFile) config({ path: envFile });
  // Namespaced root/Compose settings map to the API's existing SMTP interface.
  for (const key of [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USERNAME",
    "SMTP_PASSWORD",
    "SMTP_ENCRYPTION",
    "MAIL_FROM_ADDRESS",
    "MAIL_FROM_NAME",
  ]) {
    if (
      process.env[key] === undefined &&
      process.env[`API_${key}`] !== undefined
    ) {
      process.env[key] = process.env[`API_${key}`];
    }
  }
}

export function validateRequiredEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const protocol = new URL(databaseUrl).protocol;
    if (!["mysql:", "mariadb:"].includes(protocol)) {
      throw new Error("DATABASE_URL must use a mysql:// or mariadb:// URL.");
    }
  }

  for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    const value = process.env[key];
    if (!value || value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${key} must be at least ${MIN_SECRET_LENGTH} characters long.`,
      );
    }
  }
}

loadEnv();
