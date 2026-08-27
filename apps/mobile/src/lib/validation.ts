export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string) {
  return /^[6-9]\d{9}$/.test(value.trim());
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidNonNegativeNumber(value: string) {
  const normalized = value.trim();
  if (!normalized || !/^\d+(?:\.\d{1,2})?$/.test(normalized)) return false;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0;
}

export function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidDateOnly(value: string) {
  return parseDateOnly(value) !== null;
}

export function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
