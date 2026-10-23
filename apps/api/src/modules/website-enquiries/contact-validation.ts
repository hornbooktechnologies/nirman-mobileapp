export type ContactFields = {
  name: string;
  phone: string;
  email: string;
  organizationType: string;
  message: string;
};

export type ContactField = keyof ContactFields;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export function validateContactField(
  field: ContactField,
  value: string,
): string | undefined {
  const trimmed = value.trim();

  if (field === "name") {
    if (!trimmed) return "Enter your full name.";
    if (trimmed.length < 2) return "Enter at least 2 characters.";
    if (trimmed.length > 100) return "Name must be 100 characters or fewer.";
  }

  if (field === "phone") {
    if (!trimmed) return "Enter your mobile number.";
    if (trimmed.length > 25 || !/^[+\d\s()-]+$/.test(trimmed))
      return "Enter a valid 10-digit Indian mobile number.";
    const compact = trimmed.replace(/[\s()-]/g, "");
    const national =
      compact.startsWith("+91") && compact.length === 13
        ? compact.slice(3)
        : compact.startsWith("91") && compact.length === 12
          ? compact.slice(2)
          : compact.startsWith("0") && compact.length === 11
            ? compact.slice(1)
            : compact;
    if (!/^[6-9]\d{9}$/.test(national))
      return "Enter a valid 10-digit Indian mobile number.";
  }

  if (field === "email") {
    if (!trimmed) return "Enter your email address.";
    if (
      trimmed.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)
    ) {
      return "Enter a valid email address.";
    }
  }

  if (
    field === "organizationType" &&
    !["BUILDER", "CONTRACTOR"].includes(trimmed)
  ) {
    return "Select whether you are a builder or contractor.";
  }

  if (field === "message" && trimmed.length > 1000)
    return "Message must be 1000 characters or fewer.";
}

export function validateContactFields(
  fields: ContactFields,
): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  for (const field of [
    "name",
    "phone",
    "email",
    "organizationType",
    "message",
  ] as const) {
    const error = validateContactField(field, fields[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
